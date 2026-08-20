# Modèles d'emails d'authentification

Ces modèles se collent dans **Supabase → Authentication → Emails**, un onglet par
type de message. Ils ne sont pas poussés automatiquement : `supabase config push`
enverrait toute la configuration du projet, y compris les valeurs par défaut du
CLI pour les réglages absents de `config.toml`.

## Le point essentiel : le jeton passe par les paramètres de requête

Le lien par défaut de Supabase (`{{ .ConfirmationURL }}`) place le jeton **après
le `#`**. Or cette partie de l'adresse n'est jamais transmise au serveur, et
disparaît dès qu'un intermédiaire réécrit le lien.

C'est exactement ce qui s'est produit avec Brevo : son traceur de clics a
supprimé le jeton, et l'invitation arrivait sur un lien vide. Brevo ne permet
pas de désactiver ce suivi sur les emails transactionnels.

Le problème dépasse Brevo. Les passerelles de sécurité des messageries
d'entreprise — Microsoft Safe Links, Proofpoint et les autres — réécrivent les
liens de la même façon. Les clients visés par AGILYS, collectivités et bailleurs,
sont précisément ceux qui les déploient.

Ces modèles construisent donc l'adresse à la main :

    https://<project-ref>.supabase.co/auth/v1/verify
      ?token={{ .TokenHash }}
      &type=<invite|recovery|signup>
      &redirect_to={{ .RedirectTo }}

Le jeton est dans la requête, que tout traceur conserve. Supabase le vérifie,
puis redirige vers l'application — cette redirection-là a lieu dans le
navigateur, hors de portée du traceur.
