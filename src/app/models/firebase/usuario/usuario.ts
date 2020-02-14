
//================================================================================================================================
/*IModelo  interfaz*/
//La interfaz de modelo debe nombrarse en singular
//
//se crea el modelo de datos que se utilizara para la el servicio correspondiente
//ya que es atraves de firebase, es claro que tanto en angular como en la consola 
// de firebase (especificamente en su base de datos) se debe crear las estructuras 
// de los datos

//la estructura del modelo se basa en dos opciones: 
//la debilmente tipada (interfaces) y la fuertemente tipada (las clases)
//
//================================================================================================================================
/*IModelo  interfaz*/
//la debilmente tipada es en la que se declaran las interfaces y se usara en 
//declaraciones que solo requiera la referencia a los campos (donde no importe el tipo)
//con el fin de dar mayor flexibilidad, sin embargo se hizo una modificacion para extender 
//crear interfaces a partir de la base que es esta con el formato:
//
//interface IModelo<TExtend>{}
//
//donde el tipo   <TExtend>   recibirá alguan interfaz especial que requiera aplicar a los campos
//de la interfaz base   TModelo  o simplemente se recibe un  any  si no se requiere adicionar interfaz especial
//
//Formato para los campos:
// _id -> contiene el _id personalizado para cada documento de firebase
//        el formato del id es :  n-xxxxxxxxxxxxxxxx   donde n es el orderKey
//         y   x  es el hexa del codigo uuid generado  (solo se usa en Interfaz de nivel coleccion)
//_pathDoc-> campo especial para almacenar el path de este docuemnto especifico
//           RECORDAR: este path debe apuntar a un documento 
//           (Formato PAR:  "/coleccion/{_id}/subcoleccion/{_id....}")
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
//fk_ -> campo  que contiene rutas  _pathDoc para simular relaciones entre colecciones 
//       (si es sencillo simula relacion 1a1 y si es array simula relacion 1aMuchos)


export interface IUsuario<TExtend>{
    _id? : TExtend;  //_id personalizado creado por el modulo uuid
    _pathDoc? : TExtend; 

    nombre? : TExtend
    apellido? : TExtend;
    edad? : TExtend;
    fk_rol?: TExtend;
}

//================================================================================================================================
/*Modelo  clase*/
//la fuertemente tipada es en la que se declaran las clases (preferible no tener constructor y 
//NO DEBE TENER METODOS) y se usaran para cuando se requiera crear objetos (inclusive 
//instanciarlos) que necesiten un fuerte tipado, los campos deben tener su respectivo
//tipo y no pueden ser opcionales (excepto los especiales como los virtuales   v_ , emb_ , fk_ 
//y/u otros que se definan como especiales )
//
//IMPORTANTE:
//los campos   emb_   que apuntan a subcolecciones  y los campos   fk_  que almacenan
// strings   _pathDocs   es mejor NO INICIALIZARLOS, esto debido a que pueden generar 
//problemas de integridad de datos cuando se almacenena firestore, ya que firestore
//trata a las subColecciones y colecciones (referenciadas en los  fk_  ) como estructuras 
//INDEPENDIENTE y si se intentara almacenar una inicializacion, por ejemplo de un campo 
// emb_   como  []  , firestore asume que debe destruir la subcolecion previamente almacenada 
//y reemplazarla por un array vacio
//
//Formato para los campos en la clase:
// _id ->  los _id DEBEN SER string, su inicializacion DEBE SER "" 
//
//_pathDoc-> referencian a otros docs y por lo tanto DEBEN SER string
//            su inicializacion DEBE SER ""
//
//v_  ->  tipo personalizado, inicializacion opcional
//
//map_  -> tipo objeto {} personalizado, inicializacion personalizada (tener 
//         cuidado al guardar en BD)
//          
//mapA_  -> tipo array de objetos [{}] personalizado, inicializacion personalizada 
//          (tener cuidado al guardar en BD)
//
//emb_  ->  tipo SubColeccion [{}] (las subcolecciones se entienden explicitamente que 
//          son un array de documentos), NO INICIALIZAR, solo definir con  ?
//
//fk_ -> tipo string | string[] que contiene la o las rutas  _pathDoc  que apuntan a 
//       otros docs para simular relaciones entre colecciones (si es string simula 
//       relacion 1a1  y si es string[] simula relacion 1aMuchos), NO INICIALIZAR
//       (aunque se podria con  ""  o  []  pero toca tener extremo cuidado al 
//       almacenarlos que NO remplacen valores existentes cuando se vayan a guardar)
//
//IMPORTANTE 25/11/19:
//Por comportamiento extraño de en las consultas de firestore NO ES RECOMENDABLE USAR
//campos de tipo boolean ya que estos campos no se pueden consultar y paginar al mismo tiempo
//(no permite paginar en estandar o full, solo se podria como paginacion acumulativa pero
// el costo se eleva considerablemente)
//en caso de necesitar campos boolean es mejor usar number con 0 como false y 1 como true

export class Usuario implements IUsuario<any> {
    _id : string =""; //se asignará dinamicamente
    _pathDoc:string =""; //se asignará dinamicamente

    nombre : string ="";
    apellido : string = "";
    edad : number = 0;

    fk_rol:string = "";

}

//================================================================================================================================

