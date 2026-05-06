// Compat shim — toutes les actions existantes appellent auth() depuis @/lib/auth
export { getSession as auth } from "./session";
