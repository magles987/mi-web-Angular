//================================================================
//libreria generadora de _ids (se usa la v4 que es aleatoria, 
//la v1 es marca de tiempo)
//informacion: https://www.npmjs.com/package/uuid
import { v4 } from "uuid";
//================================================================


//aqui colocar propiedades que almacenan valores para la Query
//como valores absolutos, rangos, comparaciones y demas.
//(para los campos del modelo sobre los cuales se ejecuten algun tipo de consulta) 
//
//a los campos se les puede asignar propiedades personalizadas sin embargo existen
// algunas propiedades comunes como:
// val-> contiene el valor absoluto para la busqueda 
// ini-> contiene el valor inicial para la busqueda (ideal para la inicial de los campos string)
// min-> valor minimo (ideal para number)
// max-> valor maximo (ideal para number)
export interface IValQ<TIModelo_IOrden>{
    val?: string;
    ini?: string;
    min?: number;
    max?: number;
    
    _orden?:TIModelo_IOrden;
    //...mas propiedades en comun....
}
//================================================================================================================================


