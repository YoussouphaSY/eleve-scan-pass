# Système de Gestion de Présence

Application web de gestion de présence avec scan de QR codes, tableaux de bord pour étudiants, agents et administrateurs.

## Technologies utilisées

- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn-ui + Tailwind CSS
- **Backend**: Supabase (Base de données PostgreSQL + Authentication + Edge Functions)
- **Scan QR**: html5-qrcode

## Utiliser votre propre base de données Supabase

Par défaut, ce projet utilise Lovable Cloud (Supabase intégré). Pour utiliser votre propre instance Supabase :

### 1. Créer un projet Supabase

1. Créez un compte sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre **Project URL** et votre **anon/public key**

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet avec vos propres credentials :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre-clé-publique-anon
VITE_SUPABASE_PROJECT_ID=votre-project-id
```

### 3. Migrer le schéma de base de données

Exécutez les migrations SQL dans votre projet Supabase (via le SQL Editor) :

```sql
-- Voir les fichiers dans supabase/migrations/ pour le schéma complet

-- Tables principales :
-- profiles : Profils utilisateurs avec student_id et department
-- user_roles : Rôles (admin, agent, student)
-- attendance_records : Enregistrements de présence

-- N'oubliez pas d'activer RLS (Row Level Security) sur toutes les tables
```

### 4. Configurer l'authentification

Dans votre dashboard Supabase :
1. Allez dans **Authentication > Settings**
2. Activez **Enable email confirmations** (ou désactivez-le pour le développement)
3. Configurez les **Email Templates** si nécessaire

### 5. Déployer les Edge Functions (optionnel)

Si vous utilisez des edge functions :

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter à votre projet
supabase login
supabase link --project-ref votre-project-id

# Déployer les functions
supabase functions deploy
```

### 6. Mise à jour du fichier config.toml

Mettez à jour `supabase/config.toml` avec votre project_id :

```toml
project_id = "votre-project-id"
```

## Installation et développement local

```bash
# Cloner le repository
git clone <votre-repo-url>
cd <nom-du-projet>

# Installer les dépendances
npm install

# Créer le fichier .env avec vos credentials Supabase
# (voir section ci-dessus)

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:8080`

## Structure du projet

```
src/
├── components/       # Composants réutilisables
│   └── ui/          # Composants shadcn-ui
├── pages/           # Pages principales
│   ├── Landing.tsx         # Page d'accueil
│   ├── Auth.tsx           # Connexion/Inscription
│   ├── StudentDashboard.tsx  # Tableau de bord étudiant
│   ├── AgentScanner.tsx     # Scanner de présence (agent)
│   └── AdminDashboard.tsx   # Gestion administrative
├── integrations/    # Intégrations externes
│   └── supabase/    # Client et types Supabase
└── lib/            # Utilitaires

supabase/
├── migrations/     # Migrations SQL
└── config.toml    # Configuration Supabase
```

## Déploiement

### Option 1 : Déploiement via Lovable

Ouvrez [Lovable](https://lovable.dev/projects/9a6cf8ac-a9f9-4d6b-8745-a55786f58a7f) et cliquez sur **Share → Publish**.

### Option 2 : Déploiement manuel (Vercel, Netlify, etc.)

1. Build le projet : `npm run build`
2. Déployez le dossier `dist/`
3. Configurez les variables d'environnement sur votre plateforme

## Schéma de base de données

### Tables principales

- **profiles** : Informations utilisateurs (student_id, department, full_name)
- **user_roles** : Rôles des utilisateurs (admin, agent, student)
- **attendance_records** : Enregistrements de présence (present, late, absent)

### Politiques RLS

Toutes les tables utilisent Row Level Security pour sécuriser l'accès aux données selon les rôles utilisateurs.

## Support

Pour toute question sur Lovable : [Documentation Lovable](https://docs.lovable.dev/)

Pour Supabase : [Documentation Supabase](https://supabase.com/docs)
