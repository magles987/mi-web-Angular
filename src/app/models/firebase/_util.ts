//================================================================
//libreria generadora de _ids (se usa la v4 que es aleatoria, 
//la v1 es marca de tiempo)
//informacion: https://www.npmjs.com/package/uuid
import { v4 } from "uuid";
//================================================================

//================================================================================================================================
//
export class _Util {

    //cantidad maxima de ceros a la izquierda
    // 6 son para 1 millon de   _ids
    private _anchoIzqCeros_ids = 6 

    constructor() {        
    }

    //================================================================
    //================================================================
    //generar _IDs para documentos firebase  
    public generarIds(_orderKey: number):string{

        _orderKey++; //incrementar el numero

        //================================================================
        //Configurar la seccion del numero de _id  usada como _orderKey 
        //para agregar cero a izquierda

        //cantidad maxima de ceros a la izquierda
        // 6 son para 1 millon de   _ids
        //let anchoIzqCeros = 6; 

        let ancho_oK = _orderKey.toString().length;
        let st_orderkey = "0";
        if (this._anchoIzqCeros_ids <= ancho_oK) {
            st_orderkey = _orderKey.toString();
        } else {
            st_orderkey = `${st_orderkey.repeat(this._anchoIzqCeros_ids - ancho_oK)}${_orderKey.toString()}`
        }        
        //================================================================
        // el formtato al final que obtengo es:
        //  n-xxxxxxxxxxxxxxxx
        //donde  n   es el numero   _orderkey  y las  x   son el hexa  generado por el uuid
        let key = v4();
        key = key.replace(/-/g, ""); //quitar guiones
        key = key.slice(16); //quitar los 16 primeros bytes para que no sea tan largo el path de busqueda
        key = `${st_orderkey}-${key}`;
        return key;

        //================================================================
        //------------------------[EN CONSTRUCCION]------------------------
        //opcion con fecha (en caso tal de requerir mayor rigides en el orden al momento de generar _ids)
        //el formato que obtendria al final seria:
        //   n-f-xxxxxxxx     donde:
        //n es el numero incremental
        //f es la fecha en milisegundos en hexa
        //xxxxxxxx son hexa de uuid
        // let key = v4();
        // key = key.replace(/-/g, ""); //quitar guiones
        // key = key.slice(24); //quitar los 24 primeros bytes para que no sea tan largo el path de busqueda
        ////agrego la fecha en hexa por medio de  Date.now().toString(16)
        // key = `${st_orderkey}-${Date.now().toString(16)}-${key}`; 
        // return key;                
        //----------------------------------------------------------------
        //================================================================



    }
    //================================================================
    //Generar un _id Vacio para inicar una coleccion
    public generarIdVacio():string{
        let _idVacio = "";
        for (let i = 0; i < this._anchoIzqCeros_ids; i++) {
            _idVacio = _idVacio + "0";      
        }

        return `${_idVacio}-0000000000000000`;;
        //----------------[EN CONSTRUCCION]----------------
        //opcion con fecha:
        //return `${_idVacio}-${Date.now().toString(16)}-00000000`
        //------------------------------------------------
    }
    //================================================================
    //obtener numero _orderKey para llevar orden de documentos
    //procesa el string del v_id que debe siempre tener el siguiente formato:
    //  n-xxxxxxxxxxxxxxxx
    //donde  n   es el numero   _orderkey  y las  x   son el hexa  generado por el uuid
    public getNumOrderKey(_id:string):number{
        let _ok = _id.split("-")[0]; //escoge el primer numero del string que indica el orderkey 
        return parseInt(_ok);
    }
    //================================================================    
    //================================================================
    //permite depurar y eliminar campos que no seran almacenados en la
    //base de datos (como los campos virtuales)
    //Parametros:
    //Doc -> el documento a formatear (tambien seria el   map  a formatear 
    //       si se esta usando recursivamente)
    //modelo_Util -> el objeto util de la correspondiente coleccion (o map si se usa 
    //                recusrivamente) para determinar los atributos de cada campo 
    //                (si son maps o embebidos o virtuales)
    //isEdicionFuerte -> indica si se desea que los maps (por ahora solo los maps sencillos) 
    //                   se les realice "edicion fuerte" lo que indica que se reemplazan 
    //                   TODOS los campos del map sin excepcion, en la edicion debil 
    //                   (predefinida con false) solo se modifican los campos del map que 
    //                   realmente hallan tenido cambio de valor
    //path ?-> SOLO SE USA EN LLAMADOS RECURSIVOS, indica la ruta que se desea agregar a 
    //         los campos  de los  map a editar por medio de una ruta:
    //         "map_campo.subcampo1.subcampo11.subcampoN"
    //         por lo tanto desde un llamado externo al recursivo se debe dejar con el valor predeterminado de  ""

    protected formatearDoc<TModelo,TModelo_Util>(Doc: TModelo, modelo_Util:TModelo_Util, isEdicionFurte=false, path=""):TModelo{

        //================================================================
        //se asignan los objetos tipados a variables temporales 
        //de tipo any para usar caracteristicas fuera de typescript
        let mod_U = <any> modelo_Util;    
        let DocResult = <TModelo>{};
        //================================================================

        for (const c in Doc) {
            for (const c_U in mod_U) {
                if (c == c_U) {
                    //================================
                    //retirar los campos virtuales
                    if (mod_U[c].isVirtual) {
                        continue;
                    }                    
                    //================================
                    //================================================================
                    //formatear campos de tipo   map  
                    if (mod_U[c].isMap) {
                        if (mod_U[c].isArray && Array.isArray(Doc[c])) {
                            //================================================================
                            //IMPORTANTE: al 07/19 Firestore NO permite ediciones sobre elementos 
                            //de un array por lo tanto toda edicion se hace de caracter fuerte
                            //TODOS los elementos del array seran REEMPLAZADOS o ELIMINADOS 
                            
                            //================================================================

                            const aDoc = <any>Doc[c];
                            const raDoc = [];
                            for (let i = 0; i < aDoc.length; i++) {
                                raDoc.push(this.formatearDoc(aDoc[i], mod_U[c].util));        
                            }
                            DocResult[c] = <any>raDoc;
                            continue; 
                        } else {
                            if (isEdicionFurte) {
                                DocResult = Object.assign(DocResult, this.formatearDoc(Doc[c], mod_U[c].util, isEdicionFurte, `${path}${c}.`));
                            } else {
                                DocResult[c] = this.formatearDoc(Doc[c], mod_U[c].util);   
                            }
                            continue;   
                        }
                    }                    
                    //================================================================

                    //...aqui mas campos especiales a formatear...

                    //================================================
                    //formatear campos normales
                    if(isEdicionFurte){
                        DocResult[`${path}${c}`] = Doc[c];
                    }else{
                        DocResult[c] = Doc[c];
                    }                    
                    //================================================                    
                }
            }
        }

        return DocResult; 
    }
    //================================================================
    //================================================================
    //clonacion de objetos JSON a  diferentes niveles de profundidad
    //CUIDADO CON EL STACK, NO PUEDE SER MUY PROFUNDO
    public copiarData(data:any | any[]):any | any[]{

        let dataCopia:any;

        if (typeof(data) == "object" || Array.isArray(data)) {
            if (Array.isArray(data)) {
                dataCopia = [];
                for (let i = 0; i < data.length; i++) {
                    dataCopia[i] = this.copiarData(data[i]);
                }
            }else{
                dataCopia = {};
                for (const key in data) {
                    if (typeof(data[key]) == "object" || Array.isArray(data[key])) {
                        dataCopia[key] = this.copiarData(data[key]);                      
                    }else{
                        dataCopia[key] = data[key];
                    }
                }    
            }         
        } else {
            dataCopia = data;
        }
        return dataCopia;
    }    
    //================================================================
    //================================================================
    //verificacion y eliminacion de duplicados en un array de objetos
    //elimina los duplicados en el primer nivel en base a un campo,
    //se buscaran los objetos con el mismo valor del campo referencia
    //y se conservará solo el ultimo objeto que tenga dicho valor repetido 
    //parametros:
    //data -> array que contiene los objetos a testear y eliminar su duplicado
    //campoRef -> el nombre del campo del cual por el cual se analizaran los duplicados
    //            (normalmente es el campo identificado o   _id)
    public eliminarItemsDuplicadosArray(datos:any[], campoRef:string):any[]{

        if(datos.length > 0){
            
            let datosFiltrados:any[] = [];
            let BufferConvertidor = {};
    
            //tranforma cada objeto colocando como propiedad principal el
            // campoRef de la siguiente manera: 
            //{"campoRef1":{...data}, "campoRefUnico2":{...data}}
            //muy parecido a como usa firebase los _id como referencia de campo
            //ya que en un objeto JSON nunca puede haber 2 campos con el mismo nombre
            for(var i in datos) {
                BufferConvertidor[datos[i][campoRef]] = datos[i];
             }
             
             //reconstruye el array
             for(let i in BufferConvertidor) {
                datosFiltrados.push(BufferConvertidor[i]);
             }
              return datosFiltrados;
        
        }else{
            return [];
        }
    }    
    //================================================================
    //obtener llave para la condición del búsqueda limite mayor para
    //campos string en firestore
    public getLlaveFinBusquedaStrFirestore(llaveInicial:string):string{

        let llaveFinal:string = llaveInicial.substring(0, llaveInicial.length-1);
        let charIni:string = llaveInicial.charAt(llaveInicial.length-1);
        let charFin:string;

        //detectar los caracteres "estorbo" de mi hermoso idioma
        if (/[ñÑáéíóúÁÉÍÓÚü]/.test(charIni)) {
            charFin = charIni=="ñ" ? "o" : charIni; //--¿que pasa con ..ñó..?
            charFin = charIni=="Ñ" ? "O" : charIni; //--¿que pasa con ..ÑÓ..?
            charFin = charIni=="á" ? "b" : charIni;
            charFin = charIni=="é" ? "f" : charIni;
            charFin = charIni=="í" ? "j" : charIni;
            charFin = charIni=="ó" ? "p" : charIni;
            charFin = charIni=="ú" ? "v" : charIni;
            charFin = charIni=="Á" ? "B" : charIni;
            charFin = charIni=="É" ? "F" : charIni;
            charFin = charIni=="Í" ? "J" : charIni;
            charFin = charIni=="Ó" ? "P" : charIni;
            charFin = charIni=="Ú" ? "V" : charIni;
            charFin = charIni=="ü" ? "v" : charIni;
        } else {
            //para evitar recorrer todo el alfabeto y dígitos
            //asignar el caracter siguiente (el Unicode de charIni + 1) para la búsqueda
            charFin = String.fromCharCode(charIni.charCodeAt(0) + 1);       
        }
        //finalemente concatenar
        llaveFinal = llaveFinal + charFin;    
        return llaveFinal;
    }
    
    //================================================================

}
//================================================================================================================================
//================================================================================================================================
//Interfaz con banderas y configuracion para cada campo de cada coleccion
export interface IUtilCampo<extUtil>{
    //================================================
    //nom OBLIGATORIO, almacena el nombre del campo
    //en string para ser usado en vez de codigo rigido
    //en caso tal de cambiar el nombre solo se debe hacer 
    //en la clase util de cada coleccion 
    nom:string;    
    //================================================
    //================================================
    //validadores es un array de objetos 
    // {
    //     validator:fn(),
    //     msg:"el mensaje"
    // }
    //donde: 
    //validator es una funcion que recibe el valor del campo 
    //y devuelve true    si la validacion paso sin problemas, y    
    //false    si hubo error de validacion
    //
    //msg es el mensaje a mostrar del erro de validacion
    validadores?:{
        validator:(campoValor:any)=>boolean;  //una funcion que recibe el valor del campo, lo testea y devuelve un boolean () 
        msg:string; //un string con el mensaje
    }[];
    //================================================
    //================================================
    //bandera que se deben activar para cada campo segun corresponda
    //un campo puede tener varias banderas
    isRequerido?:boolean;
    isArray?:boolean;      
    isEmbebido?:boolean;  //indica subcoleccion
    isFk?:boolean;
    isMap?:boolean;
    isVirtual?:boolean;
    //banderas de seleccion Solo escoger un grupo
    //
    //selecUnica  o   selecMulti   se pueden cargar de 
    //forma estatica y rigida en cada campo o de forma dinamica
    //una vez se lean en la BD
    isSelecUnica?:boolean;
    selecUnica?:string[] | number[];
    isSelecMulti?:boolean;
    selecMulti?: string[] | number[];     
    //================================================
    //================================================
    //util  es una propiedad especial solo usada para
    //campos que sean de tipo map (map_ o mapA_) y 
    //subcolecciones, almacena un objeto de clase util
    //correspondiente a ese   map   o a esa subcoeccion
    util?:extUtil;
    //================================================
    //----------------[EN CONSTRUCCION]----------------
    html_util?: {
        isVisible:boolean;
        isEditable:boolean;
        label?:string;
        att_name?:string;
        att_placeholder?:string;
        att_value?:any;
        att_type?:string;       
    };    
    //------------------------------------------------


}

//================================================================================================================================
//clase encargada de la configuracion de filtrado generico para los services que usan firestore
export interface IConfigFiltroLectura<TIModelo, TModelo, TIFiltro> {

    query:(ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtro:TIFiltro)=>firebase.firestore.CollectionReference | firebase.firestore.Query;    

    isPaginar:boolean;
    isPagReactivaFull:boolean;
    orden?:TIModelo;
    limite?:number;
    docInicial:any; //es un any que en realidad es un snapshotDocument de firestore
    //tipoInicioLectura?: "after" | "before";  
    
    docValores?:TModelo;

}

//================================================================================================================================


