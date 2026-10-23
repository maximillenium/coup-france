# Guide de Déploiement en Production — CoupFranc (Linux VPS)

Ce document décrit l'installation et l'exploitation de la plateforme **CoupFranc** sur un serveur VPS Linux dédié ou autogéré (Hetzner, OVHcloud, Scaleway, DigitalOcean) sans dépendance envers des services managés coûteux (Vercel, Supabase ou Firebase).

---

## 1. Prérequis Serveur

- **Système d'exploitation :** Ubuntu 22.04 LTS ou Ubuntu 24.04 LTS
- **Ressources recommandées :** 1 vCPU, 2 Go RAM, 20 Go SSD (coût moyen : 4 à 6 € / mois)
- **Nom de domaine :** ex. `coupfranc.fr` pointant vers l'adresse IP publique de votre VPS (enregistrement A).
- **Accès :** Connexion SSH administrateur (clé publique).

---

## 2. Préparation du Serveur VPS

Connectez-vous en SSH à votre VPS :

```bash
ssh root@votre_ip_serveur
```

Mettez à jour les paquets système et installez Docker et Docker Compose :

```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Vérification
docker --version
docker compose version
```

---

## 3. Déploiement de l'Application

Créez le répertoire d'application et clonez le dépôt :

```bash
mkdir -p /opt/coupfranc
cd /opt/coupfranc

# Clonez vos sources ou copiez l'archive du projet
git clone <votre_depot_git> .
```

Configurez les variables d'environnement de production :

```bash
cp .env.example .env
nano .env
```

Générez une clé JWT secrète :
```bash
# Générer une clé de 64 caractères hexadécimaux
openssl rand -hex 32
```

Renseignez dans votre `.env` :
- `APP_URL=https://coupfranc.fr`
- `JWT_SECRET=<votre_cle_generee>`
- `TRUST_PROXY_HOPS=1`

Lancez l'application :

```bash
docker compose up -d --build
```

Vérifiez le statut du conteneur et la sonde de santé :
```bash
docker compose ps
curl -I http://127.0.0.1:3000/api/health
docker compose logs -f app
```

---

## 4. Configuration Nginx & Certificat SSL Gratuit (Let's Encrypt)

Pour sécuriser les connexions en HTTPS et masquer les ports internes :

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Créez le fichier `/etc/nginx/sites-available/coupfranc` :

```nginx
server {
    listen 80;
    server_name coupfranc.fr www.coupfranc.fr;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activez le site et obtenez le certificat SSL :

```bash
sudo ln -s /etc/nginx/sites-available/coupfranc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtention du certificat SSL HTTPS
sudo certbot --nginx -d coupfranc.fr -d www.coupfranc.fr
```

---

## 5. Procédure de Sauvegarde Automatisée

Le projet inclut un script de sauvegarde automatique dans `scripts/backup.sh` qui archive atomiquement `data/database.json` et le dossier des téléversements `data/uploads/` :

```bash
chmod +x /opt/coupfranc/scripts/backup.sh
/opt/coupfranc/scripts/backup.sh
```

Pour planifier la sauvegarde quotidienne chaque nuit à 03h00 avec rétention sur 30 jours :

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/coupfranc/scripts/backup.sh >> /var/log/coupfranc_backup.log 2>&1") | crontab -
```

Les archives compressées sont créées sous `/var/backups/coupfranc/coupfranc_backup_YYYY-MM-DD_HHMMSS.tar.gz`.

---

## 6. Procédure de Restauration

Pour restaurer une sauvegarde précédente à tout moment :

```bash
chmod +x /opt/coupfranc/scripts/restore.sh
/opt/coupfranc/scripts/restore.sh /var/backups/coupfranc/coupfranc_backup_YYYY-MM-DD_HHMMSS.tar.gz
```

Le script extrait automatiquement l'archive dans le volume persistant et recharge le conteneur CoupFranc sans perte de configuration.

---

## 7. Premier Accès Administrateur

1. Accédez à `https://coupfranc.fr/admin`
2. Connectez-vous avec l'identifiant administrateur provisionné (`admin`).
3. Modifiez immédiatement le mot de passe depuis l'interface d'administration (bouton **Changer le mot de passe** / **Sécurité**).
4. Le nouveau mot de passe est immédiatement hashé avec bcrypt (10 tours) et persisté dans le volume de stockage persistant.
