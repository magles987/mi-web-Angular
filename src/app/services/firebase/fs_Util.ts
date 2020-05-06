//permite crear los _ids personalizados
import { v4 } from "uuid";

import { _Util } from '../_Util';
import { IMetaCampo, IMetaColeccion } from './meta_Util';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*class Fs_Util<TModel>*/
//
export class Fs_Util<TModel, TModel_Meta> extends _Util{

    constructor(
        private Model_Meta:TModel_Meta
    ) {
        super();
    }

    //================================================================
    /*createModel()*/
    //retorna un objeto del modelo con los campos inicializado
    public createModel():TModel{
        let Model = <TModel>{};
        for (const c_m in this.Model_Meta) {
            //garantizar que sean campos del modelo
            //y que tengan una propiedad default
            if(this.Model_Meta[c_m].hasOwnProperty("nom") &&
               this.Model_Meta[c_m].hasOwnProperty("default")
            ){
                Model[<string>c_m] = this.Model_Meta[c_m]["default"];
            }
        }
        return Model;
    }
    //================================================================
    /*getPathCollection()*/
    //obtener el path de la coleccion o subcoleccion,
    //en las colecciones devuelve el mismo nom ya qeu son Raiz
    //Parametros:
    //
    //pathBase ->  path complemento para construir el el path completo
    //             util para las subcolecciones
    public getPathCollection(pathBase:string=""):string{

        //en caso de recibir null
        if (pathBase == null) {
            pathBase = "";
        }

        //cast obligado:
        const col_Meta = <IMetaColeccion><unknown>this.Model_Meta;

        return (col_Meta.__isEmbSubcoleccion && pathBase != "") ?
            `${pathBase}/${col_Meta.__nomColeccion}` :
            `${col_Meta.__nomColeccion}`;

    }    

    //================================================================
    /*createIds()*/
    //generar _ids personalizados con base en tiempo para documentos firebase
    public createIds():string{

        //================================================================
        // obtener la fecha en UTC en HEXA,:  
        //obtener la diferencia horaria del dispositivo con respecto al UTC 
        //con el fin de garantizar la misma zona horaria. 
        // getTimezoneOffset() entrega la diferencie en minutos, es necesario 
        //convertirlo a milisegundos    
        const difTime = new Date().getTimezoneOffset() * 60000; 
        //se obtiene la fecha en hexa par alo cual se resta la diferencia 
        //horaria y se convierte a string con base 16
        const keyDate = (Date.now() - difTime).toString(16);  
        //================================================================
        // el formtato al final que obtengo es:
        //  n-xxxxxxxxxxxxxxxx
        //donde  n   es el numero   _orderkey  y las  x   son el hexa  generado por el uuid
        let key = v4();
        key = key.replace(/-/g, ""); //quitar guiones
        key = key.slice(16); //quitar los 16 primeros bytes para que no sea tan largo el path de busqueda
        key = `${keyDate}-${key}`;
        return key;

        //================================================================

    }

    //================================================================
    /*create_pathDoc()*/
    //a partir de un _id crea una ruta path de un documento especifico,
    //en el caso de las subColecciones SIEMPRE será requiere de 
    //un path_EmbBase  SOLO PARA SUBCOLECCIONES
    public create_pathDoc(_id:string, path_EmbBase:string=""):string{
        return `${this.getPathCollection(path_EmbBase)}/${_id}`;;
    }

    //================================================================
    /*formatearDoc()*/
    //permite depurar y eliminar campos que no seran almacenados en la
    //base de datos (como los campos virtuales)
    //Parametros:
    //
    //Doc:
    //el documento a formatear (tambien seria el   map  a formatear
    //si se esta usando recursivamente)
    //
    //model_Meta
    //el objeto con la metadata del modelo
    //
    //isStrongUpdate
    //indica si se desea que los maps (por ahora solo los maps sencillos)
    //se les realice "edicion fuerte" lo que indica que se reemplazan
    //TODOS los campos del map sin excepcion, en la edicion debil
    //(predefinida con false) solo se modifican los campos del map que
    //realmente hallan tenido cambio de valor
    //
    //pathMap
    //SOLO SE USA EN LLAMADOS RECURSIVOS, indica la ruta que se desea agregar a
    //los campos  de los  map a editar por medio de una ruta:
    //"map_campo.subcampo1.subcampo11.subcampoN"
    //por lo tanto desde un llamado externo al recursivo se debe dejar con el valor predeterminado de  ""
    public formatearDoc(
        Doc: TModel | any, 
        model_meta:TModel_Meta, 
        isStrongUpdate=false, 
        pathMap=""
    ):TModel{

        //================================================================
        //se asignan los objetos tipados a variables temporales
        //de tipo any para usar caracteristicas fuera de typescript
        let mod_M = <any> model_meta;
        let DocResult = <TModel>{};
        //================================================================

        for (const c in Doc as TModel) {
            for (const c_U in mod_M) {
                if (c == c_U && c != "constructor") {

                    const m_u_campo = <IMetaCampo<any, any>>mod_M[c];
                    //================================================
                    //retirar los campos virtuales
                    if (m_u_campo.isVirtual) {
                        continue;
                    }
                    //================================================
                    //retirar los campos embebido.
                    //Los campos embebido NO pueden agregarse a firestore
                    //desde la coleccion padre, deben ser agregado o modificado
                    //desde la propia subcoleccion
                    if(m_u_campo.isEmbebido){
                        continue;
                    }
                    //================================================
                    //================================================================
                    //formatear campos de tipo   map
                    if (m_u_campo.isMap) {
                        if (m_u_campo.isArray && Array.isArray(Doc[c])) {
                            //================================================================
                            //IMPORTANTE: al 07/19 Firestore NO permite ediciones sobre elementos
                            //de un array por lo tanto toda edicion se hace de caracter fuerte
                            //TODOS los elementos del array seran REEMPLAZADOS o ELIMINADOS
                            //================================================================

                            const aDoc = <any>Doc[c];
                            const raDoc = [];
                            for (let i = 0; i < aDoc.length; i++) {
                                raDoc.push(this.formatearDoc(aDoc[i], m_u_campo.extMeta));
                            }
                            DocResult[c] = <any>raDoc;
                            continue;
                        } else {
                            if (isStrongUpdate) {
                                DocResult = Object.assign(DocResult, this.formatearDoc(Doc[c], m_u_campo.extMeta, isStrongUpdate, `${pathMap}${c}.`));
                            } else {
                                DocResult[c] = <any>this.formatearDoc(Doc[c], m_u_campo.extMeta);
                            }
                            continue;
                        }
                    }
                    //================================================================

                    //...aqui mas campos especiales a formatear...

                    //================================================
                    //formatear campos normales
                    if(isStrongUpdate){
                        DocResult[`${pathMap}${c}`] = Doc[c];
                    }else{
                        DocResult[c] = Doc[c];
                    }
                    //================================================
                }
            }
        }

        return DocResult;
    }

    /*formatearCampos()*/
    //--esta dañado--//
    public formatearCampos(Doc:TModel | any, modelo_Meta:TModel_Meta):TModel{
        for (const c in Doc) {
            for (const c_U in modelo_Meta) {
                if (c == c_U && c != "constructor") {

                    const m_u_campo = <IMetaCampo<any, any>>modelo_Meta[c];
                    //================================================
                    //determinar si el campo tienen la propiedad para formatear

                    // if(m_u_campo.formateoCampo){
                    //     //================================================
                    //     //los campos embebidos No se formatean por ahora
                    //     if(modelo_Meta[c].isEmbebido){
                    //         continue;
                    //     }
                    //     //================================================
                    //     //los campos map y arrayMap se
                    //     //formatean recursivamente
                    //     if(m_u_campo.isMap){
                    //         if (m_u_campo.isArray && Array.isArray(Doc[c])) {
                    //             for (let i = 0; i < Doc[c].length; i++) {
                    //                 Doc[c][i] = this.formatearCampos(Doc[c][i], m_u_campo.util);
                    //             }
                    //         } else {
                    //             Doc[c] = this.formatearCampos(Doc[c], m_u_campo.util);
                    //         }
                    //         continue;
                    //     }
                    //     //================================================
                    //     //los campos array basico tienen se
                    //     //formatean recursivamente
                    //     if(m_u_campo.isArray && Array.isArray(Doc[c])){
                    //         for (let i = 0; i < Doc[c].length; i++) {
                    //             Doc[c][i] = this.formatearCampos(Doc[c][i], m_u_campo.util);
                    //         }
                    //         continue;
                    //     }
                    //     //================================================
                    //     //Formatear campo normal:
                    //     Doc[c] = m_u_campo.formateoCampo(Doc[c]);
                    // }

                    //================================================
                }
            }
        }
        return Doc;
    }


    //================================================================
    /*getLlaveFinBusquedaStrFirestore()*/
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
    /*deleteDocsDuplicateForArray()*/
    //verificacion y eliminacion de duplicados en un array de objetos
    //elimina los duplicados en el primer nivel en base a un campo,
    //se buscaran los objetos con el mismo valor del campo referencia
    //y se conservará solo el ultimo objeto que tenga dicho valor repetido
    //parametros:
    //docs -> array que contiene los objetos a testear y eliminar su duplicado
    //campoRef -> el nombre del campo del cual por el cual se analizaran los duplicados
    //            (normalmente es el campo identificado o   _id)
    public deleteDocsDuplicateForArray(docs:TModel[], campoRef:string):any[]{

        if(docs.length > 0){

            let datosFiltrados:any[] = [];
            let BufferConvertidor = {};

            //tranforma cada objeto colocando como propiedad principal el
            // campoRef de la siguiente manera:
            //{"campoRef1":{...data}, "campoRefUnico2":{...data}}
            //muy parecido a como usa firebase los _id como referencia de campo
            //ya que en un objeto JSON nunca puede haber 2 campos con el mismo nombre
            for(var i in docs) {
                BufferConvertidor[docs[i][campoRef]] = docs[i];
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

    /*deleteDocsNullForArray()*/
    //elimina todos los elementos con valor null del array de documentos
    //Parametros:
    //docs el array de documentos a analizar si tienen objetos null
    public deleteDocsNullForArray(docs:TModel[]):TModel[]{
        return docs.filter((doc) => (doc && doc != null));
    }

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████