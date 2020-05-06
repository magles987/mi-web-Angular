import { IValuesQuery } from '../_IShared';
import { Iemb_SubColeccion } from 'src/app/models/firebase/producto/emb_subColeccion';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesQuery[Model]:*/
//objetos contenedores de valores auxiliares para construir la consulta
export interface IValuesQueryEmb_SubColeccion extends IValuesQuery {
        
        //Orden para los campos 
        order?:Iemb_SubColeccion<"asc"|"desc">;

        //================================================
        //objetos utilitarios que almacenan los valores para 
        //construir Querys poco complejas
        
        //consultar igualdad en valor string
        VQ_EqualStr?: Iemb_SubColeccion<string>;
        //consultar inicial o inicio de un string
        VQ_IniStr?: Iemb_SubColeccion<string>;
        //consultar igualdad en valor numerico
        VQ_EqualNum?: Iemb_SubColeccion<number>;
        //consultar mayor que en valor numerico
        VQ_GtNum?: Iemb_SubColeccion<number>;
        //consultar mayor o igual que en valor numerico
        VQ_GtEqNum?: Iemb_SubColeccion<number>;           
        //consultar menor que en valor numerico
        VQ_LtNum?: Iemb_SubColeccion<number>;
        //consultar menor o igual que en valor numerico
        VQ_LtEqNum?: Iemb_SubColeccion<number>;   
        //consultar entre valores numericos
        VQ_BtNum?: Iemb_SubColeccion<{Gt:number, Lt:number}>;        
        
        //================================================
        //Objetos que almacenan Valores para construir 
        //Querys mas complejas

}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesHooks[Model]:*/
//contiene la tipificacion de los valores de lso hooks que deben ser 
//implementados en cualquier service de cualquier proveedor de BD
export interface IValuesHooksEmb_SubColeccion<TModel_Meta> {

    //================================================
    //Son obligatorios asi no se requieran en la clase 
    //HookService[Model] que los implemente
    v_preGet:{
        //aqui colocar las propiedades para los hooks
    };
    v_preMod:{
        //aqui colocar las propiedades para los hooks
    } 
    v_preDelete:{
        //aqui colocar las propiedades para los hooks
    };

    v_postMod:{
        //aqui colocar las propiedades para los hooks
    };
    v_postDelete:{
        //aqui colocar las propiedades para los hooks
    }; 

    //================================================
    //la metadata del modelo se requiere para las 
    //operaciones del Hook en cualquier implementacion
    //este meta puede ser proveeido por cualquier Backend
    model_Meta:TModel_Meta;

}