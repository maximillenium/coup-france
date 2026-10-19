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

Générez une clé JWT secrète et un mot de passe de base de données robuste :
```bash
# Générer une clé de 64 caractères aléatoires
openssl rand -hex 32
```

Renseignez dans votre `.env` :
- `APP_URL=https://coupfranc.fr`
- `JWT_SECRET=<votre_cle_generee>`
- `POSTGRES_PASSWORD=<mot_de_passe_robuste>`

Lancez les conteneurs :

```bash
docker compose up -d --build
```

Vérifiez le statut :
```bash
docker compose ps
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

Créez le script `/opt/coupfranc/scripts/backup.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/coupfranc"
DATE=$(date +%Y-%m-%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 1. Sauvegarde de la base de données PostgreSQL
docker exec coupfranc_postgres pg_dump -U coupfranc coupfranc_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# 2. Sauvegarde des images téléversées
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /opt/coupfranc/data uploads

# 3. Suppression des sauvegardes de plus de 30 jours
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Sauvegarde CoupFranc terminée avec succès le $DATE"
```

Rendez-le exécutable et ajoutez-le au cron quotidien :

```bash
chmod +x /opt/coupfranc/scripts/backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/coupfranc/scripts/backup.sh >> /var/log/coupfranc_backup.log 2>&1") | crontab -
```

---

## 6. Procédure de Restauration

Pour restaurer une sauvegarde :

```bash
# Restaurer la base de données
gunzip < /var/backups/coupfranc/db_YYYY-MM-DD_HHMMSS.sql.gz | docker exec -i coupfranc_postgres psql -U coupfranc -d coupfranc_db

# Restaurer les images
tar -xzf /var/backups/coupfranc/uploads_YYYY-MM-DD_HHMMSS.tar.gz -C /opt/coupfranc/data
```

---

## 7. Premier Accès Administrateur

1. Accédez à `https://coupfranc.fr/admin`
2. Identifiants initiaux :
   - **Email :** `admin@coupfranc.fr`
   - **Mot de passe initial :** `AdminCoupFranc2026!`
3. Modifiez impérativement le mot de passe dès la première connexion via l'onglet **Sécurité** du tableau de bord.
