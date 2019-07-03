//================================================================
//libreria generadora de _ids (se usa la v4 que es aleatoria, 
//la v1 es marca de tiempo)
//informacion: https://www.npmjs.com/package/uuid
import { v4 } from "uuid";
//================================================================

//================================================================================================================================
//
export class _Util {
    constructor() {        
    }

    //================================================================
    //generar _IDs para documentos firebase  
    // el formtato al final que obtengo es:
    //  n-xxxxxxxxxxxxxxxx
    //donde  n   es el numero   _orderkey  y las  x   son el hexa  generado por el uuid
    public generarIds(_orderKey: number):string{

        _orderKey++; //incrementar el numero

        let key = v4();
        key = key.replace(/-/g, ""); //quitar guiones
        key = key.slice(16); //quitar los 16 primeros bytes para que no sea tan largo el path de busqeuda
        key = `${_orderKey}-${key}`;
        return key;
    }
    //================================================================
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

    protected formatearDoc<TModelo,TModelo_Util>(Doc: TModelo, modelo_Util:TModelo_Util, path=""):TModelo{

        //================================================================
        //se asignan los objetos tipados a variables temporales 
        //de tipo any para usar caracteristicas fuera de typescript
        let mod_U = <any> modelo_Util;    
        let DocResult = <TModelo>{};
        
        for (const c in Doc) {
            for (const c_U in mod_U) {
                if (c == c_U) {
                    if (mod_U[c].isVirtual) {
                        continue;
                    }
                    if (mod_U[c].isMap) {
                        if (mod_U[c].isArray && Array.isArray(Doc[c])) {
                            const aDoc = <any>Doc[c];
                            const raDoc = [];
                            for (let i = 0; i < aDoc.length; i++) {
                                raDoc.push(this.formatearDoc(aDoc[i], mod_U[c].util));        
                            }
                            DocResult[c] = <any>raDoc;
                            continue; 
                        } else {
                            DocResult[c] = this.formatearDoc(Doc[c], mod_U[c].util);
                            continue;   
                        }
                    }
                    DocResult[c] = Doc[c];
                }
            }
        }

        return DocResult; 
    }
    //================================================================
    //================================================================
    //clonacion de objetos JSON a  diferentes niveles de profundidad
    protected copiarData(data:any | any[]):any | any[]{

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
    //================================================
    //================================================
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