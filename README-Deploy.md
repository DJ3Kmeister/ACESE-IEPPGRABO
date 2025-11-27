# Déploiement ACESE – IEPP GRABO

## 1. Render (gratuit)
1. Créer compte → https://render.com  
2. New Web Service → connecter GitHub (repo contenant ce dossier server)  
3. Build Command : `npm install`  
   Start Command : `node server.js`  
4. Plan : Free  
5. Deploy → récupérer l’URL :  
   - API : `https://xxx.onrender.com/api/eleves`  
   - Dashboard : `https://xxx.onrender.com/admin`

## 2. Fly.io (alternatif)
```bash
fly launch --name aceese-iepp-grabo --port 3000
fly deploy
