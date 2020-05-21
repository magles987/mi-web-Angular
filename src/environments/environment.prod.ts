import { firebase_secretCredentials } from "./secret_credentials";
export const environment = {
  production: true,
  firebase : firebase_secretCredentials.prod,
  
  //en produccion siempre debe ser false
  emuleFirestoreLocal: false 
};
