Terminal 1 — Backend:                                                         
cd ~/Grad/Projects/ytm-clone/backend                                          
python -m venv venv && source venv/bin/activate                               
pip install -r requirements.txt                                               
cp .env.example .env   # add GENIUS_ACCESS_TOKEN                              
uvicorn app.main:app --reload --port 8000                                     
                                                                            
Terminal 2 — Frontend:                                                        
cd ~/Grad/Projects/ytm-clone/frontend                                         
npm run dev   # opens at http://localhost:5173