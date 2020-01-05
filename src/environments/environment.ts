// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

//================================================================
//este archivo sirve para cargar las configuraciones de conexiones a
//servicios externos como bases de datos hostings y de mas servicios
// que requiera angular
// para este caso la conexion a firebase
//================================================================
import { firebase_secretCredentials } from "./secret_credentials";

export const environment = {
  production: false,
  firebase : firebase_secretCredentials.dev
  // {
  //   apiKey: "XXXXXXXXXXXXXXXXXXXXXX",
  //   authDomain: "XXXXXXXXXXX.firebaseapp.com",
  //   databaseURL: "https://XXXXXXXXXXXXXXX.firebaseio.com",
  //   projectId: "XXXXXXXXXXXXXXXXX",
  //   storageBucket: "XXXXXXXXXXXXX.appspot.com",
  //   messagingSenderId: "XXXXXXXXXXXXXXX",
  //   appId: "1:XXXXXXXXXXXXXXX:web:XXXXXXXXXXXXXXXXX"
  // }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
