
// export enum ETipoValidador{
//     Required,
    
//     RegExp,

//     MatchString,
//     RangeLengthString,
//     EnumString,
//     NotEnumString,

//     MatchNumber,
//     RangeNumber,

//     MatchDate,
//     RangeDate, 
    
//     async,

// }

// export interface IValidatorRequired{
//     required: true;
// }

// export interface IValidatorMatch<TCampo>{
//     match: TCampo;
// }

// export interface IValidatorRange{
//     min?:number,
//     max?:number
// }

// export interface IValidatorEnum<TCampo>{
//     match: TCampo[]; 
// }

// export interface IValidatorAsync{
//     url: string; 
// }




// export interface ICampo_Meta<TCampo, ext_Meta>{

//     //nom OBLIGATORIO, almacena el nombre del campo
//     //en string para ser usado en vez de codigo rigido
//     //en caso tal de cambiar el nombre solo se debe hacer
//     //en la clase util de cada coleccion
//     nom:string;

//     //nom que contiene toda la ruta path de los subCampos de un campo map
//     //se usa para configurar querys con condiciones en estos campos
//     //los campos array map no requieren esta funcioanlidad ya que
//     //las querys para cualquier campo array en firestore son muy limitadas
//     nomMapPath?:string;

//     //validadores es un array de objetos
//     // 

//     validators?:{
//         validator:IValidatorRequired |
//                   IValidatorMatch<TCampo> |
//                   IValidatorRange |
//                   IValidatorEnum<TCampo> |
//                   IValidatorAsync, 
//         type:ETipoValidador, 
//         msg:string}[];

//     //banderas que se deben activar para cada campo segun corresponda
//     //un campo puede tener varias banderas
//     isRequerido?:boolean;
//     isArray?:boolean;
//     isEmbebido?:boolean;  //indica subcoleccion
//     isFk?:boolean;
//     isMap?:boolean;
//     isVirtual?:boolean;

//     //utilidad para los campos number
//     //determina como redondear el numero
//     //y cuantos decimales asignar
//     //esto por medio del metodo
//     //ajustarDecimales()
//     //de la clase _util,
//     //si es null, no ejecuta ajuste
//     expFactorRedondeo?:number | null;

//     //propiedad especial para campos number
//     //(incluso los number que simulan ser boolean)
//     //se usa para cuando se requiere consultar
//     //un valor absoluto para generar la consulta
//     //especial de igualdad por el comportamiento
//     //extraño de firestore que no permite consultar
//     //y paginar igualdades de campos number
//     //este campo almacena un numero maximo con cual
//     //poder construir la query de igualdad.
//     //este factor debe estar entre 0 y 1, normalmente
//     // es 1 sin embargo si el campo almacena numeros
//     //con decimales este factor debe contar con un decimal
//     //mayor los registros del campo, ejemplo: si el campo
//     //almacena datos como 12.034 (con 3 decimales) el maximo
//     //factor debe ser   0.0001   (con 4 decimales).
//     //(para los campos que simulan ser boolean el maximo Factor es 1)
//     maxFactorIgualdadQuery?:number;


//     //banderas de seleccion Solo escoger un grupo
//     //
//     //selecUnica  o   selecMulti   se pueden cargar de
//     //forma estatica y rigida en cada campo o de forma dinamica
//     //una vez se lean en la BD
//     isSelecUnica?:boolean;
//     selecUnica?:TCampo[];
//     isSelecMulti?:boolean;
//     selecMulti?:TCampo[];

//     tipeSelect?:"unica"|"multiple";  
//     selectList?:TCampo[];

//     //util  es una propiedad especial solo usada para
//     //campos que sean de tipo map (map_ o mapA_) y
//     //subcolecciones, almacena un objeto de clase util
//     //correspondiente a ese   map   o a esa subcoeccion
//     util?:ext_Meta;
// }


