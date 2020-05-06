import { IValuesQuery } from '../_IShared';
import { IRol } from 'src/app/models/firebase/rol/rol';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesQuery[Model]:*/
//objetos contenedores de valores auxiliares para construir la consulta
export interface IValuesQueryRol extends IValuesQuery {
        
        //Orden para los campos 
        order?:IRol<"asc"|"desc">;

        //================================================
        //objetos utilitarios que almacenan los valores para 
        //construir Querys poco complejas
        
        //consultar igualdad en valor string
        VQ_EqualStr?: IRol<string>;
        //consultar inicial o inicio de un string
        VQ_IniStr?: IRol<string>;
        //consultar igualdad en valor numerico
        VQ_EqualNum?: IRol<number>;
        //consultar mayor que en valor numerico
        VQ_GtNum?: IRol<number>;
        //consultar mayor o igual que en valor numerico
        VQ_GtEqNum?: IRol<number>;        
        //consultar menor que en valor numerico
        VQ_LtNum?: IRol<number>;
        //consultar menor o igual que en valor numerico
        VQ_LtEqNum?: IRol<number>;        
        //consultar entre valores numericos
        VQ_BtNum?: IRol<{Gt:number, Lt:number}>;        
        
        //================================================
        //Objetos que almacenan Valores para construir 
        //Querys mas complejas


}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesHooks[Model]:*/
//
export interface IValuesHooksRol<TModel_Meta> {

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