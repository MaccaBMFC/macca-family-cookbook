THE MACCA FAMILY COOKBOOK — VERSION 1.1

FILES TO UPLOAD TO GITHUB
Upload every file in this folder and replace the older files with the same names.

SUPABASE SETUP
1. Create a Supabase project.
2. Open SQL Editor → New query.
3. Open supabase-setup.sql from this folder, copy everything, paste it into the SQL Editor, and click Run.
4. Open Authentication → Users → Add user.
5. Create your own email/password account. Create Jess's account later if desired.
6. Find the Project URL and Publishable key in Supabase's Connect or project settings area.
7. Open config.js and replace the two PASTE_... values.
8. Upload all updated files to GitHub.
9. After GitHub Pages redeploys, refresh the cookbook.
10. Tap Recipe Manager and sign in.

SECURITY
The publishable key is designed to be used in browser code.
The SQL script enables Row Level Security:
- anyone may read recipes
- only authenticated accounts may add, edit or delete recipes

DO NOT place a Supabase service-role or secret key in config.js.
Use only the Publishable key (or legacy anon public key if that is what the dashboard displays).