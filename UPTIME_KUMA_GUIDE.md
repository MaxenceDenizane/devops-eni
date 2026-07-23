# Uptime Kuma - Guide de Configuration

## 🎯 Qu'est-ce que Uptime Kuma?

**Uptime Kuma** est un outil open-source de monitoring qui permet de:
- ✅ Vérifier la disponibilité des services (uptime)
- ✅ Monitorer les temps de réponse (latence)
- ✅ Recevoir des alertes en cas de problème
- ✅ Consulter un historique des incidents
- ✅ Afficher un statut public personnalisé

## 🚀 Démarrage Rapide

### 1. Lancer les services avec Uptime Kuma

```bash
docker-compose up -d
```

Cela va démarrer:
- **MySQL** sur le port `3306`
- **Backend API** sur le port `3000` avec endpoint `/health`
- **Uptime Kuma** sur le port `3001`

### 2. Accéder à Uptime Kuma

Ouvrez votre navigateur et allez à: **http://localhost:3001**

Lors du premier accès, vous devrez créer un compte administrateur.

## 📊 Configuration du Monitoring

### Étape 1: Créer un Monitor HTTP

1. Connectez-vous à Uptime Kuma
2. Cliquez sur **"Add Monitor"**
3. Configurez comme suit:

```
Monitor Type: HTTP(s)
URL: http://localhost:3000/health
  OU
URL: http://backend:3000/health (depuis Docker)
Friendly Name: Backend API Health
Description: Monitor la disponibilité du Backend API
Interval: 30 secondes (par défaut)
Timeout: 10 secondes
Retries: 3
```

4. Cliquez sur **"Save"**

### Étape 2: Créer un Monitor pour l'API racine

1. **Add Monitor**
2. Configuration:

```
Monitor Type: HTTP(s)
URL: http://localhost:3000
Friendly Name: Backend API Root
Description: Vérifie que l'API répond
Interval: 60 secondes
```

### Étape 3: Créer un Monitor pour MySQL (optionnel)

Pour monitorer MySQL via TCP:

```
Monitor Type: TCP
Hostname: localhost
Port: 3306
Friendly Name: MySQL Database
Description: Vérifie la disponibilité de MySQL
Interval: 60 secondes
```

## 🔔 Configurer les Notifications

### Discord (Recommandé)

1. Dans Uptime Kuma, allez dans **Settings** → **Notifications**
2. Cliquez **"Add Notification"**
3. Choisissez **Discord**
4. Collez votre **Discord Webhook URL**
   - Récupérez-la dans: Discord → Server → Channel → Integrations → Webhooks
5. Configurez:
   - **Enabled**: Oui
   - **Apply on all monitors**: Oui

### Email

1. **Add Notification** → **Email (SMTP)**
2. Configurez vos paramètres SMTP:
   - SMTP Host: `smtp.gmail.com` (pour Gmail)
   - SMTP Port: `587`
   - Email/Login: `votre.email@gmail.com`
   - Password: Mot de passe d'application Gmail
   - From Email: `votre.email@gmail.com`

### Slack

1. **Add Notification** → **Slack**
2. Entrez votre **Slack Webhook URL**
   - Créez-la dans Slack → Apps → Incoming Webhooks

## 📈 Endpoints de Monitoring

Votre application expose maintenant:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | **Health check** - Status UP/DOWN + uptime |
| `GET /` | Endpoint racine - Simple vérification |
| `GET /api/tasks` | Liste des tâches |
| `POST /api/tasks` | Créer une tâche |

## 🔍 Interprétation des Statuts

| Statut | Signification |
|--------|---------------|
| 🟢 **UP** | Service disponible et répond correctement |
| 🔴 **DOWN** | Service indisponible ou ne répond pas |
| 🟡 **PENDING** | Vérification en cours |
| ⚫ **UNKNOWN** | Statut non déterminé |

## 📊 Dashboard Personnalisé

### Créer un Status Page public

1. Allez dans **Settings** → **Status Page**
2. Cliquez **"Create Status Page"**
3. Configurez:
   - **Slug**: `status` (accès via http://localhost:3001/status/status)
   - **Title**: `Backend API Status`
   - **Description**: `État du service Backend`
   - **Monitors**: Sélectionnez vos monitors à afficher
4. Cliquez **"Save"**

Votre page de statut public sera accessible à:
```
http://localhost:3001/status/status
```

## 🚨 Configuration des Alertes

### Alertes Automatiques

Uptime Kuma vous alertera automatiquement si:
- ❌ Un service devient DOWN
- ⚠️ Le temps de réponse dépasse un seuil (configurable par monitor)
- 📉 Le uptime chute en dessous de 99%

### Niveaux d'Alerte

Dans **Monitor Settings**, vous pouvez configurer:
- **Max. Response Time**: Alerte si dépassé (ex: 2000ms)
- **Retries**: Nombre de tentatives avant déclaration DOWN

## 📝 Cas d'Usage Typiques

### Scénario 1: Détection d'une Défaillance

```
14:30 - Backend API UP (Response time: 150ms)
14:31 - Backend API DOWN (Connection refused)
→ Notification Discord/Email immédiate
14:32 - Backend API UP (automatiquement détecté)
→ Notification Discord/Email de rétablissement
```

### Scénario 2: Dégradation des Performances

```
14:00 - Response time: 150ms (Normal)
14:15 - Response time: 2500ms (Alerte!)
14:30 - Response time: 150ms (Retour à la normale)
```

## 🐳 Uptime Kuma dans Docker Compose

Configuration dans `docker-compose.yml`:

```yaml
uptime-kuma:
  image: louislam/uptime-kuma:latest
  container_name: uptime-kuma_container
  restart: unless-stopped
  ports:
    - "3001:3001"
  volumes:
    - uptime_data:/app/data
  environment:
    PUID: 1000
    PGID: 1000
```

**Données persistantes**: Stockées dans le volume `uptime_data`

## 🔧 Commandes Utiles

```bash
# Voir les logs d'Uptime Kuma
docker logs uptime-kuma_container

# Redémarrer Uptime Kuma
docker restart uptime-kuma_container

# Accéder au shell du container
docker exec -it uptime-kuma_container sh

# Vérifier les monitors de l'API
curl -s http://localhost:3000/health | jq
```

## 📊 Intégration avec GitHub Actions

Vous pouvez ajouter un smoke test dans GitHub Actions qui vérifies l'endpoint `/health`:

```yaml
- name: Smoke test with health check
  run: |
    response=$(curl -s http://localhost:3000/health)
    status=$(echo $response | jq -r '.status')
    if [ "$status" != "UP" ]; then
      echo "Health check failed: $response"
      exit 1
    fi
    echo "✓ Health check passed"
```

## 🔐 Sécurité

### Points Importants

1. **Authentification**: Uptime Kuma s'exécute localement, protégez l'accès
2. **Port 3001**: Ne l'exposez pas en production sans authentification
3. **Webhooks**: Gardez vos URLs de webhook confidentielles
4. **Base de données**: Uptime Kuma stocke ses données dans `uptime_data/`

## 🌐 Déploiement en Production

Pour un déploiement en production:

```yaml
uptime-kuma:
  # ... configuration
  ports:
    - "127.0.0.1:3001:3001"  # Accessible localement seulement
  # Ajouter un reverse proxy (nginx) ou authentification
```

Utilisez Nginx comme reverse proxy:
- Protégez avec basic auth
- Utilisez HTTPS
- Limitez les connexions par IP

## 📚 Ressources

- 📖 **Docs Officielles**: https://uptime.kuma.pet/
- 🐳 **Docker Hub**: https://hub.docker.com/r/louislam/uptime-kuma
- 🌟 **GitHub**: https://github.com/louislam/uptime-kuma
- 💬 **Communauté**: https://discord.gg/uptime-kuma

## ✅ Checklist Setup

- [ ] Docker compose lancé (`docker-compose up -d`)
- [ ] Uptime Kuma accessible sur http://localhost:3001
- [ ] Compte admin créé
- [ ] Monitor HTTP `/health` configuré
- [ ] Monitor HTTP racine configuré
- [ ] Notifications Discord/Email configurées
- [ ] Status page créée
- [ ] Vérification que les alertes fonctionnent

---

**Prêt à monitorer?** 🚀 Lancez `docker-compose up -d` et allez sur http://localhost:3001!
