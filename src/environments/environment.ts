// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

//================================================================
//este archivo sirve para cargar las configuraciones de conexiones a
//servicios externos como bases de datos hostings y de mas servicios
// que requiera angular
// para este caso la conexion a firebase
//================================================================

export const environment = {
  production: false,
  firebase : {
    apiKey: "AIzaSyB5htWVKU09imVbTR9bz23iAQsFFhXDQ7g",
    authDomain: "prueba1-87d2f.firebaseapp.com",
    databaseURL: "https://prueba1-87d2f.firebaseio.com",
    projectId: "prueba1-87d2f",
    storageBucket: "prueba1-87d2f.appspot.com",
    messagingSenderId: "567889637995",
    appId: "1:567889637995:web:a2bcd830f0cc5ad5"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
