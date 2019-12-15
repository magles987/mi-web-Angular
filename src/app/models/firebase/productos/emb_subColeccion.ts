
//================================================================================================================================
/*IModelo*/
//La interfaz de modelo debe nombrarse en singular
//
//se crea el modelo de datos que se utilizara para la el servicio correspondiente
//ya que es atraves de firebase, es claro que tanto en angular como en la consola 
// de firebase (especificamente en su base de datos) se debe crear las estructuras 
// de los datos

//la estructura del modelo se basa en dos opciones 
//la debilmente tipada y la fuertemente tipada
//
//la debilmente tipada es en la que se declaran las interfaces y se usara en 
//declaraciones que solo requiera la referencia a los campos (donde no importe el tipo)
//en esta opcion TODOS los campos de la interfaces seran OPCIONALES con el fin de dar 
//mayor flexibilidad y su TIPO será any
//
//la fuertemente tipada es en la que se declaran las clases (NO PUEDEN TENER CONSTRUCTOR 
//NI NINGUN METODO) y se usaran para cuando se requiera crear objetos (inclusive 
//instanciarlos) que necesiten un fuerte tipado, los campos deben tener su respectivo
//tipo y no pueden ser opcionales (excepto los especiales como los virtuales   v_   y 
//otros que se definan como especiales )

//Formato para los campos:
// _id -> contiene el _id personalizado para cada documento de firebase
//        el formato del id es :  n-xxxxxxxxxxxxxxxx   donde n es el orderKey
//         y   x  es el hexa del codigo uuid generado  (solo se usa en Interfaz de nivel coleccion)
//_pathDoc-> campo especial para almacenar el path de este docuemnto especifico
//           RECORDAR: este path debe apuntar a un documento 
//           (Formato PAR:  "/coleccion/_id/subcoleccion/_id....")
//v_  ->  prefijo para campos que son virtuales (NO se almacenan en la BD)
//map_  -> prefijo para campos de tipo   map   sencillos (por legibilidad se recomienda hacer referencia 
//          a la interfaz correspondiente y a any)
//          IMPORTANTE: requieren crear indice para consultarlos internamente
//mapA_  -> prefijo para campos de tipo  Array de map (por legibilidad se recomienda hacer referencia 
//          a la interfaz correspondiente y a any)
//          IMPORTANTE: los campos array o  array de maps no pueden ser consultados 
//          ni editados  item a item (su unica consulta fiable es la "array-contains"), por lo tanto se 
//          acondeja a usar para almacenar informacion poco procesable
//emb_  ->  prefijo para campos de subColeccion   (embebidos)   
//          IMPORTANTE: Estos campos se pueden consultar de forma independiente (una a una) como si se trataran de una coleccion normal
//          pero este comportamiento rara ves es usado ya que la mayoria de consultas requieren es consultar el GRUPO de subcolecciones 
//          de la coleccion padre y lamentablemente firestore no esta configurado para permitir esta consultas de manera predeterminada, 
//           por lo cual es necesario crear una EXENCION (el mismo angularfire2 lo sugiere como error cunado detecta esta consulta )
//fk_ -> campo string que contiene rutas  _pathDoc para simular relaciones entre colecciones 
//       (si es sencillo simula relacion 1a1 y si es array simula relacion 1aMuchos)

//IMPORTANTE 25/11/19:
//Por comportamiento extraño de en las consultas de firestore NO ES RECOMENDABLE USAR
//campos de tipo boolean ya que estos campos no se pueden consultar y paginar al mismo tiempo
//(no permite paginar en estandar o full, solo se podria como paginacion acumulativa pero
// el costo se eleva considerablemente)
//en caso de necesitar campos boolean es mejor usar number con 0 como false y 1 como true

//================================================================================================================================
//================================================================================================================================
//Seccion interfaces:

export interface Iemb_SubColeccion<TExtent>{
    _id? : any;  //_id personalizado creado por el modulo uuid
    _pathDoc? : any; 

    subCampo1?:any;
    subCampo2?:any;

}
//================================================================================================================================
/*Modelo  clase*/
//en la declaracion de clases si se especifica el tipo para cada campo 
//es muy recomendable que cada propiedad este inicializada
//no es recomendable que tenga algun metodo

//IMPORTANTE:
//en las clases todos los campos deben tener su correspondiente tipo
//NO DEBEN SER OPCIONALES (excepto los virtuales y especiales que no se 
//almacenen en la BD)

export class emb_SubColeccion implements Iemb_SubColeccion<any> {
    _id : string =""; //se asignará dinamicamente
    _pathDoc:string =""; //se asignará dinamicamente

    subCampo1:string = "";
    subCampo2:string = "";
}

//================================================================================================================================

