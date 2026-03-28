"""
YouTube Music Clone — Backend Server
FastAPI server reusing Freedify's streaming services.
"""
import os
import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.deezer_service import deezer_service
from app.audio_service import audio_service
from app.ytmusic_service import ytmusic_service
from app.lastfm_service import lastfm_service
from app.artist_service import artist_service
from app.genius_service import genius_service
from app.cache import cleanup_cache, periodic_cleanup, is_cached, get_cache_path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ── Stream URL cache (avoids re-running API chain on seek/range requests) ──
_stream_url_cache: dict = {}
STREAM_CACHE_TTL = 1800  # 30 minutes

# ── Home page cache (Deezer chart + YTMusic shelves, refreshed every 10 min) ──
_home_cache: dict = {"data": None, "ts": 0}
HOME_CACHE_TTL = 600  # 10 minutes


async def _purge_expired_stream_urls():
    while True:
        await asyncio.sleep(STREAM_CACHE_TTL)
        now = time.time()
        expired = [k for k, v in _stream_url_cache.items() if now - v[2] > STREAM_CACHE_TTL]
        for k in expired:
            del _stream_url_cache[k]
        if expired:
            logger.info(f"Purged {len(expired)} expired stream URL cache entries")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting YouTube Music Clone backend...")
    await cleanup_cache()
    try:
        await audio_service.update_tidal_apis()
    except Exception as e:
        logger.warning(f"Failed to pre-warm Tidal APIs: {e}")
    cleanup_task = asyncio.create_task(periodic_cleanup(30))
    stream_cache_task = asyncio.create_task(_purge_expired_stream_urls())
    yield
    cleanup_task.cancel()
    stream_cache_task.cancel()
    await deezer_service.close()
    await audio_service.close()
    logger.info("Server shutdown complete.")


app = FastAPI(title="YTM Clone", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_custom_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    if request.url.path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=86400"
    return response


# ══════════════════════════════════════════════════════════
# HEALTH
# ══════════════════════════════════════════════════════════

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "ytm-clone"}


# ══════════════════════════════════════════════════════════
# HOME PAGE
# ══════════════════════════════════════════════════════════

@app.get("/api/home")
async def get_home():
    """Featured content from Deezer charts + YouTube Music editorial shelves."""
    global _home_cache
    now = time.time()
    if _home_cache["data"] and now - _home_cache["ts"] < HOME_CACHE_TTL:
        return _home_cache["data"]

    async def _deezer_chart():
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get("https://api.deezer.com/chart")
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.warning(f"Deezer chart error: {e}")
        return None

    async def _ytm_home():
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, ytmusic_service.ytm.get_home, 3)
        except Exception as e:
            logger.warning(f"YTMusic home error: {e}")
        return None

    chart_data, ytm_shelves = await asyncio.gather(_deezer_chart(), _ytm_home())

    trending_tracks = []
    new_releases = []
    featured_artists = []

    if chart_data:
        tracks_raw = chart_data.get("tracks", {}).get("data", [])
        for t in tracks_raw[:20]:
            art = (t.get("album") or {}).get("cover_xl") or (t.get("album") or {}).get("cover_big", "")
            trending_tracks.append({
                "id": f"dz_{t['id']}",
                "type": "track",
                "name": t.get("title", ""),
                "artists": t.get("artist", {}).get("name", ""),
                "album": t.get("album", {}).get("title", ""),
                "album_art": art,
                "duration_ms": t.get("duration", 0) * 1000,
                "isrc": t.get("isrc", f"dz_{t['id']}"),
                "source": "deezer",
                "rank": t.get("position", 0),
            })

        albums_raw = chart_data.get("albums", {}).get("data", [])
        for a in albums_raw[:12]:
            art = a.get("cover_xl") or a.get("cover_big", "")
            new_releases.append({
                "id": f"dz_{a['id']}",
                "type": "album",
                "name": a.get("title", ""),
                "artists": a.get("artist", {}).get("name", ""),
                "album_art": art,
                "source": "deezer",
            })

        artists_raw = chart_data.get("artists", {}).get("data", [])
        for ar in artists_raw[:10]:
            featured_artists.append({
                "id": f"dz_{ar['id']}",
                "type": "artist",
                "name": ar.get("name", ""),
                "album_art": ar.get("picture_xl") or ar.get("picture_big", ""),
                "source": "deezer",
            })

    # Pull mood shelves from YTMusic editorial
    moods = []
    if ytm_shelves:
        for shelf in ytm_shelves:
            title = shelf.get("title", "")
            contents = shelf.get("contents", [])
            if title and contents:
                moods.append({"label": title, "query": title})
            if len(moods) >= 8:
                break

    result = {
        "trending_tracks": trending_tracks,
        "new_releases": new_releases,
        "featured_artists": featured_artists,
        "moods": moods,
    }
    _home_cache["data"] = result
    _home_cache["ts"] = now
    return result


@app.get("/api/home/charts")
async def get_charts():
    """Deezer top tracks, albums and artists."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            tracks_resp, albums_resp, artists_resp = await asyncio.gather(
                client.get("https://api.deezer.com/chart/0/tracks?limit=50"),
                client.get("https://api.deezer.com/chart/0/albums?limit=20"),
                client.get("https://api.deezer.com/chart/0/artists?limit=20"),
            )

            def fmt_track(t):
                art = (t.get("album") or {}).get("cover_xl") or (t.get("album") or {}).get("cover_big", "")
                return {
                    "id": f"dz_{t['id']}",
                    "type": "track",
                    "name": t.get("title", ""),
                    "artists": t.get("artist", {}).get("name", ""),
                    "album": t.get("album", {}).get("title", ""),
                    "album_art": art,
                    "duration_ms": t.get("duration", 0) * 1000,
                    "isrc": t.get("isrc", f"dz_{t['id']}"),
                    "source": "deezer",
                }

            def fmt_album(a):
                return {
                    "id": f"dz_{a['id']}",
                    "type": "album",
                    "name": a.get("title", ""),
                    "artists": a.get("artist", {}).get("name", ""),
                    "album_art": a.get("cover_xl") or a.get("cover_big", ""),
                    "source": "deezer",
                }

            def fmt_artist(ar):
                return {
                    "id": f"dz_{ar['id']}",
                    "type": "artist",
                    "name": ar.get("name", ""),
                    "album_art": ar.get("picture_xl") or ar.get("picture_big", ""),
                    "source": "deezer",
                }

            tracks = [fmt_track(t) for t in tracks_resp.json().get("data", [])]
            albums = [fmt_album(a) for a in albums_resp.json().get("data", [])]
            artists = [fmt_artist(ar) for ar in artists_resp.json().get("data", [])]

            return {"tracks": tracks, "albums": albums, "artists": artists}
        except Exception as e:
            logger.error(f"Charts error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# SEARCH
# ══════════════════════════════════════════════════════════

@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=1),
    type: str = Query("track", description="track | album | artist"),
    offset: int = Query(0),
):
    """Search via YTMusic + Deezer concurrently. YTMusic preferred for tracks."""
    try:
        # YTMusic-specific search
        if type == "ytmusic":
            results = await ytmusic_service.search_tracks(q, limit=20, offset=offset)
            return {"results": results, "query": q, "type": "track", "source": "ytmusic", "offset": offset}

        results = []
        source = "deezer"

        async def _ytm_search():
            if type != "track":
                return []
            try:
                return await ytmusic_service.search_tracks(q, limit=20, offset=offset)
            except Exception as e:
                logger.error(f"YTMusic search error: {e}")
                return []

        async def _deezer_search():
            try:
                if type == "album":
                    return await deezer_service.search_albums(q, limit=20, offset=offset)
                elif type == "artist":
                    return await deezer_service.search_artists(q, limit=20, offset=offset)
                else:
                    return await deezer_service.search_tracks(q, limit=20, offset=offset)
            except Exception as e:
                logger.error(f"Deezer search error: {e}")
                return []

        # Race YTMusic (5s timeout for tracks) and Deezer
        ytm_task = asyncio.create_task(asyncio.wait_for(_ytm_search(), timeout=5.0))
        deezer_task = asyncio.create_task(_deezer_search())

        try:
            ytm_results = await ytm_task
        except (asyncio.TimeoutError, Exception):
            ytm_results = []

        if ytm_results and type == "track":
            results = ytm_results
            source = "ytmusic"
            deezer_task.cancel()
        else:
            try:
                deezer_results = await deezer_task
            except Exception:
                deezer_results = []
            if deezer_results:
                results = deezer_results
                source = "deezer"

        return {"results": results, "query": q, "type": type, "source": source, "offset": offset}
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search/suggestions")
async def search_suggestions(q: str = Query(..., min_length=1)):
    """Autocomplete suggestions from YouTube Music."""
    try:
        loop = asyncio.get_event_loop()
        suggestions = await loop.run_in_executor(
            None, ytmusic_service.ytm.get_search_suggestions, q
        )
        return {"suggestions": suggestions or []}
    except Exception as e:
        logger.warning(f"Suggestions error: {e}")
        return {"suggestions": []}


# ══════════════════════════════════════════════════════════
# ALBUM
# ══════════════════════════════════════════════════════════

@app.get("/api/album/{album_id}")
async def get_album(album_id: str):
    try:
        if album_id.startswith("ytm_"):
            album = await ytmusic_service.get_album(album_id)
        elif album_id.startswith("dz_"):
            album = await deezer_service.get_album(album_id)
        else:
            album = await deezer_service.get_album(album_id)

        if not album:
            raise HTTPException(status_code=404, detail="Album not found")
        return album
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Album fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# ARTIST
# ══════════════════════════════════════════════════════════

@app.get("/api/artist/{artist_id}")
async def get_artist(artist_id: str):
    try:
        if artist_id.startswith("dz_"):
            artist = await deezer_service.get_artist(artist_id)
        else:
            artist = await deezer_service.get_artist(artist_id)
        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")
        return artist
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Artist fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/artist/{name}/bio")
async def get_artist_bio(name: str):
    result = await artist_service.get_artist_bio(name)
    if not result:
        raise HTTPException(status_code=404, detail="Artist not found")
    return result


@app.get("/api/artist/{name}/similar")
async def get_similar_artists(name: str):
    artists = await lastfm_service.get_similar_artists(name)
    return {"artists": artists or []}


@app.get("/api/artist/{name}/albums")
async def get_artist_albums(name: str, limit: int = Query(20)):
    results = await deezer_service.search_albums(name, limit=limit)
    return {"albums": results or []}


# ══════════════════════════════════════════════════════════
# STREAMING
# ══════════════════════════════════════════════════════════

@app.api_route("/api/stream/{isrc}", methods=["GET", "HEAD"])
async def stream_audio(
    request: Request,
    isrc: str,
    q: Optional[str] = Query(None),
    hires: bool = Query(True),
    hires_quality: str = Query("6"),
    source: Optional[str] = Query(None),
):
    """Stream audio by ISRC. Supports ytm_, dz_, LINK: prefixes and bare ISRCs."""
    try:
        logger.info(f"Stream request: {isrc}")
        target_stream_url = None

        # ── Handle LINK: (podcast episodes, imported URLs) ──
        if isrc.startswith("LINK:"):
            import base64
            from urllib.parse import urlparse
            try:
                encoded = isrc.replace("LINK:", "")
                encoded += "=" * ((4 - len(encoded) % 4) % 4)
                original_url = base64.urlsafe_b64decode(encoded).decode()
                parsed = urlparse(original_url)
                audio_exts = ('.mp3', '.m4a', '.ogg', '.wav', '.aac', '.opus', '.flac', '.m4b', '.mp4')
                if any(parsed.path.lower().endswith(ext) for ext in audio_exts):
                    target_stream_url = original_url
                else:
                    loop = asyncio.get_event_loop()
                    target_stream_url = await loop.run_in_executor(
                        None, audio_service._get_stream_url, original_url
                    )
            except Exception as e:
                logger.warning(f"LINK: parse failed: {e}")

        # ── Handle YouTube Music (ytm_) ──
        elif isrc.startswith("ytm_"):
            video_id = isrc.replace("ytm_", "")
            youtube_url = f"https://music.youtube.com/watch?v={video_id}"
            loop = asyncio.get_event_loop()
            target_stream_url = await loop.run_in_executor(
                None, audio_service._get_stream_url, youtube_url
            )

        # ── Proxy resolved direct stream URL ──
        if target_stream_url:
            logger.info(f"Proxying direct stream: {target_stream_url[:60]}...")
            req_headers = {}
            if request.headers.get("Range"):
                req_headers["Range"] = request.headers.get("Range")

            stream_timeout = httpx.Timeout(connect=10.0, read=300.0, write=10.0, pool=10.0)
            client = httpx.AsyncClient(follow_redirects=True, timeout=stream_timeout)
            try:
                req = client.build_request("GET", target_stream_url, headers=req_headers)
                r = await client.send(req, stream=True)
                resp_headers = {
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600",
                    "Access-Control-Allow-Origin": "*",
                    "X-Accel-Buffering": "no",
                }
                for key in ["Content-Range", "Content-Length", "Content-Type", "Last-Modified", "ETag"]:
                    if r.headers.get(key):
                        resp_headers[key] = r.headers[key]

                async def _iter_direct():
                    try:
                        async for chunk in r.aiter_bytes(chunk_size=65536):
                            yield chunk
                    finally:
                        await r.aclose()
                        await client.aclose()

                return StreamingResponse(
                    _iter_direct(),
                    status_code=r.status_code,
                    media_type=r.headers.get("Content-Type", "audio/mpeg"),
                    headers=resp_headers,
                )
            except Exception as e:
                await client.aclose()
                logger.error(f"Direct proxy failed: {e}")

        # ── Standard path: file cache → stream URL cache → fetch_flac pipeline ──
        cache_ext = "flac"
        mime_type = "audio/flac"

        if is_cached(isrc, cache_ext):
            cache_path = get_cache_path(isrc, cache_ext)
            logger.info(f"Serving from cache: {cache_path}")
            return FileResponse(
                cache_path,
                media_type=mime_type,
                headers={"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400"},
            )

        cached = _stream_url_cache.get(isrc)
        metadata = None
        if cached:
            cached_url, cached_meta, cached_time = cached
            if time.time() - cached_time < STREAM_CACHE_TTL:
                target_stream_url = cached_url
                metadata = cached_meta
            else:
                del _stream_url_cache[isrc]
                cached = None

        if not cached:
            result = await audio_service.fetch_flac(
                isrc, q or "", hires=hires, hires_quality=hires_quality, source=source
            )
            if not result:
                raise HTTPException(status_code=404, detail="Could not fetch audio")

            if isinstance(result[0], str):
                target_stream_url = result[0]
                metadata = result[1]
                _stream_url_cache[isrc] = (target_stream_url, metadata, time.time())
            else:
                flac_data, metadata = result
                headers = {
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(len(flac_data)),
                    "Cache-Control": "public, max-age=86400",
                    "Access-Control-Expose-Headers": "X-Audio-Quality, X-Audio-Format, Content-Type, Content-Length",
                    "X-Audio-Format": "FLAC",
                    "X-Audio-Quality": "Hi-Res" if (metadata and metadata.get("is_hi_res")) else "Standard",
                }
                return Response(content=flac_data, media_type="audio/flac", headers=headers)

        # ── HEAD response ──
        if request.method == "HEAD":
            return Response(
                status_code=200,
                headers={
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Expose-Headers": "X-Audio-Quality, X-Audio-Format, Content-Type, Content-Length",
                    "Content-Type": "audio/flac",
                    "X-Audio-Format": "FLAC",
                    "X-Audio-Quality": "Hi-Res" if (metadata and metadata.get("is_hi_res")) else "Standard",
                },
            )

        # ── Proxy the resolved stream URL ──
        logger.info(f"Proxying FLAC stream: {target_stream_url[:60]}...")
        req_headers = {}
        if request.headers.get("Range"):
            req_headers["Range"] = request.headers.get("Range")

        stream_timeout = httpx.Timeout(connect=10.0, read=300.0, write=10.0, pool=10.0)
        client = httpx.AsyncClient(timeout=stream_timeout, follow_redirects=True)
        try:
            upstream_req = client.build_request("GET", target_stream_url, headers=req_headers)
            upstream_resp = await client.send(upstream_req, stream=True)

            resp_headers = {
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "X-Audio-Quality, X-Audio-Format, Content-Type, Content-Length",
                "X-Accel-Buffering": "no",
                "X-Audio-Format": "FLAC",
                "X-Audio-Quality": "Hi-Res" if (metadata and metadata.get("is_hi_res")) else "Standard",
            }
            for key in ["Content-Range", "Content-Length", "Content-Type"]:
                if upstream_resp.headers.get(key):
                    resp_headers[key] = upstream_resp.headers[key]

            async def _iter_upstream():
                try:
                    async for chunk in upstream_resp.aiter_bytes(chunk_size=65536):
                        yield chunk
                finally:
                    await upstream_resp.aclose()
                    await client.aclose()

            return StreamingResponse(
                _iter_upstream(),
                status_code=upstream_resp.status_code,
                media_type=upstream_resp.headers.get("Content-Type", "audio/flac"),
                headers=resp_headers,
            )
        except Exception as e:
            await client.aclose()
            raise

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stream error for {isrc}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# LYRICS
# ══════════════════════════════════════════════════════════

@app.get("/api/lyrics")
async def get_lyrics(artist: str, title: str):
    result = await genius_service.get_lyrics_and_info(artist, title)
    return result


# ══════════════════════════════════════════════════════════
# RECOMMENDATIONS (next song)
# ══════════════════════════════════════════════════════════

LASTFM_API_KEY = "ba96abee2841548b666379432119b31e"

# Cache recommendations to avoid repeated slow lookups (30-min TTL)
_recs_cache: dict = {}
RECS_CACHE_TTL = 1800


def _parse_ytm_tracks(tracks_raw, skip_first=True):
    out = []
    for t in (tracks_raw[1:] if skip_first else tracks_raw):
        vid = t.get("videoId")
        if not vid:
            continue
        thumbs = t.get("thumbnail") or []
        art = thumbs[-1]["url"] if thumbs else ""
        if art and "googleusercontent" in art:
            art = f"/api/proxy_image?url={art}"
        out.append({
            "id": f"ytm_{vid}",
            "type": "track",
            "name": t.get("title", ""),
            "artists": ", ".join(a.get("name", "") for a in (t.get("artists") or [])),
            "album": (t.get("album") or {}).get("name", ""),
            "album_art": art,
            "duration_ms": 0,
            "isrc": f"ytm_{vid}",
            "source": "ytmusic",
        })
    return out


async def _ytm_recs(name: str, artist: str, isrc: Optional[str], limit: int) -> list:
    """YTMusic watch playlist — language-aware. Direct for ytm_ tracks, search first for others."""
    loop = asyncio.get_event_loop()
    video_id = isrc.replace("ytm_", "") if (isrc and isrc.startswith("ytm_")) else None

    if not video_id:
        def _find():
            try:
                hits = ytmusic_service.ytm.search(f"{name} {artist}", filter="songs", limit=3)
                return hits[0].get("videoId") if hits else None
            except Exception:
                return None
        video_id = await loop.run_in_executor(None, _find)

    if not video_id:
        return []

    def _watch():
        data = ytmusic_service.ytm.get_watch_playlist(videoId=video_id, limit=limit + 2)
        return data.get("tracks", [])

    tracks_raw = await loop.run_in_executor(None, _watch)
    return _parse_ytm_tracks(tracks_raw, skip_first=True)


async def _deezer_recs(isrc: str, limit: int) -> list:
    """Deezer Radio — fast fallback for dz_ tracks."""
    deezer_id = isrc.replace("dz_", "")
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            resp = await client.get(f"https://api.deezer.com/track/{deezer_id}/radio?limit={limit}")
            if resp.status_code != 200:
                return []
            out = []
            for t in resp.json().get("data", []):
                art = (t.get("album") or {}).get("cover_xl") or (t.get("album") or {}).get("cover_big", "")
                out.append({
                    "id": f"dz_{t['id']}",
                    "type": "track",
                    "name": t.get("title", ""),
                    "artists": t.get("artist", {}).get("name", ""),
                    "album": t.get("album", {}).get("title", ""),
                    "album_art": art,
                    "duration_ms": t.get("duration", 0) * 1000,
                    "isrc": t.get("isrc", f"dz_{t['id']}"),
                    "source": "deezer",
                })
            return out
    except Exception:
        return []


async def _lastfm_recs(artist: str, limit: int) -> list:
    """Last.fm artist.getSimilar → YTMusic per artist. Preserves regional language."""
    loop = asyncio.get_event_loop()
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                "https://ws.audioscrobbler.com/2.0/",
                params={
                    "method": "artist.getSimilar",
                    "artist": artist,
                    "api_key": LASTFM_API_KEY,
                    "format": "json",
                    "limit": 6,
                    "autocorrect": 1,
                },
            )
        if resp.status_code != 200:
            return []
        similar_artists = [
            a["name"] for a in resp.json().get("similarartists", {}).get("artist", [])
            if a.get("name")
        ]

        def _songs_for_artist(a_name):
            try:
                return ytmusic_service.ytm.search(a_name, filter="songs", limit=3)[:2]
            except Exception:
                return []

        batches = await asyncio.gather(
            *[loop.run_in_executor(None, _songs_for_artist, a) for a in similar_artists[:6]],
            return_exceptions=True,
        )
        seen, out = set(), []
        for hits in batches:
            if not isinstance(hits, list):
                continue
            for t in hits:
                vid = t.get("videoId")
                if not vid or vid in seen:
                    continue
                seen.add(vid)
                thumbs = t.get("thumbnails") or []
                art = thumbs[-1]["url"] if thumbs else ""
                if art and "googleusercontent" in art:
                    art = f"/api/proxy_image?url={art}"
                out.append({
                    "id": f"ytm_{vid}",
                    "type": "track",
                    "name": t.get("title", ""),
                    "artists": ", ".join(a.get("name", "") for a in (t.get("artists") or [])),
                    "album": (t.get("album") or {}).get("name", ""),
                    "album_art": art,
                    "duration_ms": 0,
                    "isrc": f"ytm_{vid}",
                    "source": "ytmusic",
                })
        return out
    except Exception as e:
        logger.warning(f"Last.fm similar artists error: {e}")
        return []


@app.get("/api/recommendations")
async def get_recommendations(
    name: str = Query(...),
    artist: str = Query(...),
    isrc: Optional[str] = Query(None),
    limit: int = Query(10),
):
    # ── Cache check ──
    cache_key = f"{isrc or name}||{artist}"
    if cache_key in _recs_cache:
        data, ts = _recs_cache[cache_key]
        if time.time() - ts < RECS_CACHE_TTL:
            return {"recommendations": data}

    results = []

    # ── 1 & 2: Run YTMusic watch playlist + Deezer Radio concurrently ──
    # For ytm_ tracks only YTMusic runs (no videoId search needed — direct).
    # For dz_ tracks both run in parallel; YTMusic result is preferred.
    tasks: list = [asyncio.create_task(_ytm_recs(name, artist, isrc, limit))]
    if isrc and isrc.startswith("dz_"):
        tasks.append(asyncio.create_task(_deezer_recs(isrc, limit)))

    done = await asyncio.gather(*tasks, return_exceptions=True)
    ytm_result = done[0] if not isinstance(done[0], Exception) else []
    dz_result  = done[1] if len(done) > 1 and not isinstance(done[1], Exception) else []

    results = ytm_result or dz_result

    # ── 3: Last.fm fallback with hard timeout ──
    if not results:
        try:
            results = await asyncio.wait_for(_lastfm_recs(artist, limit), timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning("Last.fm fallback timed out")

    final = results[:limit]
    _recs_cache[cache_key] = (final, time.time())
    return {"recommendations": final}


# ══════════════════════════════════════════════════════════
# IMAGE PROXY
# ══════════════════════════════════════════════════════════

@app.get("/api/proxy_image")
async def proxy_image(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="No URL provided")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch image")
            return Response(
                content=resp.content,
                media_type=resp.headers.get("Content-Type", "image/jpeg"),
                headers={"Cache-Control": "public, max-age=86400"},
            )
    except Exception as e:
        logger.error(f"Image proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# SPA CATCH-ALL (serves React frontend in production)
# ══════════════════════════════════════════════════════════

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
