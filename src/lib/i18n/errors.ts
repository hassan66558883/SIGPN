/**
 * Translation of messages produced by the service layer (BusinessError, FormState.message).
 * Services speak English; the UI translates on display. Exact matches first, then patterns.
 * Unknown strings pass through unchanged.
 */
import type { Locale } from "@/lib/i18n";

const EXACT: Record<string, string> = {
  // action-utils
  "Your role does not allow this action. The attempt has been recorded.": "Votre rôle ne permet pas cette action. La tentative a été enregistrée.",
  "You must change your password before continuing.": "Vous devez changer votre mot de passe avant de continuer.",
  "Multi-factor authentication is required before continuing.": "L'authentification à deux facteurs est requise avant de continuer.",
  "Your session has expired. Please sign in again.": "Votre session a expiré. Veuillez vous reconnecter.",
  "Please correct the highlighted fields.": "Veuillez corriger les champs signalés.",
  "The operation failed.": "L'opération a échoué.",
  "Too many requests. Please try again later.": "Trop de requêtes. Veuillez réessayer plus tard.",
  // auth actions
  "Enter your username and password.": "Saisissez votre nom d'utilisateur et votre mot de passe.",
  "Sign-in failed.": "Échec de la connexion.",
  "Enter the 6-digit code from your authenticator or a recovery code.": "Saisissez le code à 6 chiffres de votre application ou un code de récupération.",
  "Verification failed.": "Échec de la vérification.",
  "All three fields are required.": "Les trois champs sont obligatoires.",
  "The new passwords do not match.": "Les nouveaux mots de passe ne correspondent pas.",
  "does not match": "ne correspond pas",
  "Password changed. Your other sessions were signed out.": "Mot de passe modifié. Vos autres sessions ont été déconnectées.",
  "Password change failed.": "Échec du changement de mot de passe.",
  "Enter your username or e-mail.": "Saisissez votre nom d'utilisateur ou votre e-mail.",
  "Request failed.": "Échec de la demande.",
  "If the account exists, an administrator has been notified and will provide you with a reset link.": "Si le compte existe, un administrateur a été notifié et vous fournira un lien de réinitialisation.",
  "Invalid request.": "Requête invalide.",
  "The passwords do not match.": "Les mots de passe ne correspondent pas.",
  "Reset failed.": "Échec de la réinitialisation.",
  "Could not start enrolment.": "Impossible de démarrer l'enrôlement.",
  "Enter the 6-digit code.": "Saisissez le code à 6 chiffres.",
  "Multi-factor authentication is now enabled.": "L'authentification à deux facteurs est maintenant activée.",
  "Enrolment failed.": "Échec de l'enrôlement.",
  "Multi-factor authentication disabled.": "Authentification à deux facteurs désactivée.",
  "Could not disable MFA.": "Impossible de désactiver la 2FA.",
  "New recovery codes generated. The old ones no longer work.": "Nouveaux codes de récupération générés. Les anciens ne fonctionnent plus.",
  "Could not regenerate codes.": "Impossible de régénérer les codes.",
  "Session revoked.": "Session révoquée.",
  "Could not revoke session.": "Impossible de révoquer la session.",
  "API key created. Copy it now — it will not be shown again.": "Clé API créée. Copiez-la maintenant — elle ne sera plus affichée.",
  "Could not create API key.": "Impossible de créer la clé API.",
  "API key revoked.": "Clé API révoquée.",
  "Could not revoke API key.": "Impossible de révoquer la clé API.",
  // login service
  "Invalid username or password.": "Nom d'utilisateur ou mot de passe invalide.",
  "This account is not active. Contact your administrator.": "Ce compte n'est pas actif. Contactez votre administrateur.",
  "Your sign-in session expired. Please sign in again.": "Votre session de connexion a expiré. Veuillez vous reconnecter.",
  "Too many incorrect codes. Please sign in again.": "Trop de codes incorrects. Veuillez vous reconnecter.",
  "This account cannot complete sign-in. Contact your administrator.": "Ce compte ne peut pas terminer la connexion. Contactez votre administrateur.",
  "Incorrect verification code.": "Code de vérification incorrect.",
  "Current password is incorrect.": "Le mot de passe actuel est incorrect.",
  "User not found.": "Utilisateur introuvable.",
  "This reset link is invalid or has expired.": "Ce lien de réinitialisation est invalide ou a expiré.",
  "This account is disabled.": "Ce compte est désactivé.",
  "Start the enrolment first.": "Démarrez d'abord l'enrôlement.",
  "The code is incorrect. Check the time on your device and try again.": "Le code est incorrect. Vérifiez l'heure de votre appareil et réessayez.",
  "Your role requires multi-factor authentication; it cannot be disabled.": "Votre rôle exige l'authentification à deux facteurs ; elle ne peut pas être désactivée.",
  "Password is incorrect.": "Mot de passe incorrect.",
  "MFA is not enabled.": "La 2FA n'est pas activée.",
  "The code is incorrect.": "Le code est incorrect.",
  "Session not found.": "Session introuvable.",
  "You already have 5 active API keys. Revoke one first.": "Vous avez déjà 5 clés API actives. Révoquez-en une d'abord.",
  "API key not found.": "Clé API introuvable.",
  // admin actions / services
  "Could not create the user.": "Impossible de créer l'utilisateur.",
  "Could not update the user.": "Impossible de mettre à jour l'utilisateur.",
  "User updated.": "Utilisateur mis à jour.",
  "Invalid status.": "Statut invalide.",
  "Could not change the status.": "Impossible de changer le statut.",
  "One-time reset link issued. Hand it to the user through a secure channel; it is shown only once.": "Lien de réinitialisation à usage unique émis. Remettez-le à l'utilisateur par un canal sécurisé ; il n'est affiché qu'une fois.",
  "Could not issue a reset link.": "Impossible d'émettre un lien de réinitialisation.",
  "Could not revoke sessions.": "Impossible de révoquer les sessions.",
  "MFA reset. The user must enrol again.": "2FA réinitialisée. L'utilisateur doit s'enrôler à nouveau.",
  "Could not reset MFA.": "Impossible de réinitialiser la 2FA.",
  "Could not create the role.": "Impossible de créer le rôle.",
  "Role updated.": "Rôle mis à jour.",
  "Could not update the role.": "Impossible de mettre à jour le rôle.",
  "Permissions saved. Users whose permissions were reduced must sign in again.": "Permissions enregistrées. Les utilisateurs dont les permissions ont été réduites doivent se reconnecter.",
  "Could not save permissions.": "Impossible d'enregistrer les permissions.",
  "Selected role is invalid or inactive.": "Le rôle sélectionné est invalide ou inactif.",
  "Only national-scope administrators can grant national roles.": "Seuls les administrateurs de périmètre national peuvent accorder des rôles nationaux.",
  "You can only manage users inside your own region/station.": "Vous ne pouvez gérer que les utilisateurs de votre propre région/commissariat.",
  "Selected station is invalid.": "Le commissariat sélectionné est invalide.",
  "Selected region is invalid.": "La région sélectionnée est invalide.",
  "A regional role requires a region.": "Un rôle régional exige une région.",
  "A station-scoped role requires a station.": "Un rôle de commissariat exige un commissariat.",
  "This username is already taken.": "Ce nom d'utilisateur est déjà utilisé.",
  "This e-mail is already registered.": "Cet e-mail est déjà enregistré.",
  "Selected officer does not exist.": "L'agent sélectionné n'existe pas.",
  "This officer already has a user account.": "Cet agent possède déjà un compte utilisateur.",
  "You cannot change your own role.": "Vous ne pouvez pas changer votre propre rôle.",
  "Cannot demote the last active system administrator.": "Impossible de rétrograder le dernier administrateur système actif.",
  "You cannot change your own account status.": "Vous ne pouvez pas changer le statut de votre propre compte.",
  "Cannot deactivate the last active system administrator.": "Impossible de désactiver le dernier administrateur système actif.",
  "The account was modified concurrently. Reload and retry.": "Le compte a été modifié simultanément. Rechargez et réessayez.",
  "Only national administrators can create national-scope roles.": "Seuls les administrateurs nationaux peuvent créer des rôles de périmètre national.",
  "A role with this code already exists.": "Un rôle avec ce code existe déjà.",
  "The SUPER_ADMIN role is locked.": "Le rôle SUPER_ADMIN est verrouillé.",
  "Only national administrators can edit national-scope roles.": "Seuls les administrateurs nationaux peuvent modifier des rôles de périmètre national.",
  "The SUPER_ADMIN role always holds every permission and cannot be edited.": "Le rôle SUPER_ADMIN détient toujours toutes les permissions et ne peut pas être modifié.",
  "System roles cannot be deactivated.": "Les rôles système ne peuvent pas être désactivés.",
  "Could not update the notification.": "Impossible de mettre à jour la notification.",
  "Could not update notifications.": "Impossible de mettre à jour les notifications.",
  "All notifications marked as read.": "Toutes les notifications ont été marquées comme lues.",
  "Request body must be valid JSON.": "Le corps de la requête doit être un JSON valide.",
  "Validation failed.": "Échec de la validation.",
};

// Password-policy fragments (joined with "; " inside the composite message)
const POLICY_FRAGMENTS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^at least (\d+) characters$/, (m) => `au moins ${m[1]} caractères`],
  [/^at most 128 characters$/, () => "au plus 128 caractères"],
  [/^at least three of: lowercase, uppercase, digit, symbol$/, () => "au moins trois catégories parmi : minuscule, majuscule, chiffre, symbole"],
  [/^not a commonly used password$/, () => "pas un mot de passe courant"],
  [/^must not contain your username$/, () => "ne doit pas contenir votre nom d'utilisateur"],
  [/^must not contain your e-mail name$/, () => "ne doit pas contenir le nom de votre e-mail"],
  [/^must not repeat a single character$/, () => "ne doit pas répéter un seul caractère"],
];

function translateFragment(f: string): string {
  for (const [re, fn] of POLICY_FRAGMENTS) {
    const m = f.match(re);
    if (m) return fn(m);
  }
  return f;
}

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Account temporarily locked\. Try again in (\d+) minutes or contact an administrator\.$/, (m) => `Compte temporairement verrouillé. Réessayez dans ${m[1]} minutes ou contactez un administrateur.`],
  [/^Password does not meet the policy: (.+)\.$/, (m) => `Le mot de passe ne respecte pas la politique : ${m[1].split("; ").map(translateFragment).join(" ; ")}.`],
  [/^Temporary password does not meet the policy: (.+)\.$/, (m) => `Le mot de passe temporaire ne respecte pas la politique : ${m[1].split("; ").map(translateFragment).join(" ; ")}.`],
  [/^You cannot reuse one of your last (\d+) passwords\.$/, (m) => `Vous ne pouvez pas réutiliser l'un de vos ${m[1]} derniers mots de passe.`],
  [/^Account is now (\w+)\.$/, (m) => `Le compte est maintenant ${m[1]}.`],
  [/^(\d+) session\(s\) revoked\.$/, (m) => `${m[1]} session(s) révoquée(s).`],
  [/^Cannot move an account from (\w+) to (\w+)\.$/, (m) => `Impossible de faire passer un compte de ${m[1]} à ${m[2]}.`],
  [/^You cannot grant the role "(.+)": it holds permissions you do not have \((.+)\)\.$/, (m) => `Vous ne pouvez pas accorder le rôle « ${m[1]} » : il détient des permissions que vous n'avez pas (${m[2]}).`],
  [/^You cannot grant permissions you do not hold: (.+)\.$/, (m) => `Vous ne pouvez pas accorder des permissions que vous ne détenez pas : ${m[1]}.`],
  [/^You cannot remove permissions you do not hold yourself: (.+)\.$/, (m) => `Vous ne pouvez pas retirer des permissions que vous ne détenez pas vous-même : ${m[1]}.`],
  [/^MFA cannot be switched off for the system role (\w+)\.$/, (m) => `La 2FA ne peut pas être désactivée pour le rôle système ${m[1]}.`],
  [/^This role is still assigned to (\d+) user\(s\)\. Reassign them first\.$/, (m) => `Ce rôle est encore attribué à ${m[1]} utilisateur(s). Réaffectez-les d'abord.`],
  [/^(\w+) not found or outside your scope\.$/, (m) => `${m[1] === "User" ? "Utilisateur" : m[1] === "Role" ? "Rôle" : m[1]} introuvable ou hors de votre périmètre.`],
];

export function translateMessage(message: string, locale: Locale): string {
  if (locale === "en") return message;
  const exact = EXACT[message];
  if (exact) return exact;
  for (const [re, fn] of PATTERNS) {
    const m = message.match(re);
    if (m) return fn(m);
  }
  return message;
}
