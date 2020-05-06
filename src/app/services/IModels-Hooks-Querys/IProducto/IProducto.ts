import { IValuesQuery } from '../_IShared';
import { IProducto } from 'src/app/models/firebase/producto/producto';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesQuery[Model]:*/
//objetos contenedores de valores auxiliares para construir la consulta
export interface IValuesQueryProducto extends IValuesQuery {
        
        //Orden para los campos 
        order?:IProducto<"asc"|"desc">;

        //================================================
        //objetos utilitarios que almacenan los valores para 
        //construir Querys poco complejas
        
        //consultar igualdad en valor string
        VQ_EqualStr?: IProducto<string>;
        //consultar inicial o inicio de un string
        VQ_IniStr?: IProducto<string>;
        //consultar igualdad en valor numerico
        VQ_EqualNum?: IProducto<number>;
        //consultar mayor que en valor numerico
        VQ_GtNum?: IProducto<number>;
        //consultar mayor o igual que en valor numerico
        VQ_GtEqNum?: IProducto<number>;           
        //consultar menor que en valor numerico
        VQ_LtNum?: IProducto<number>;
        //consultar menor o igual que en valor numerico
        VQ_LtEqNum?: IProducto<number>;   
        //consultar entre valores numericos
        VQ_BtNum?: IProducto<{Gt:number, Lt:number}>;        
        
        //================================================
        //Objetos que almacenan Valores para construir 
        //Querys mas complejas

}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesHooks[Model]:*/
//contiene la tipificacion de los valores de lso hooks que deben ser 
//implementados en cualquier service de cualquier proveedor de BD
export interface IValuesHooksProducto<TModel_Meta> {

    //================================================
    //Son obligatorios asi no se requieran en la clase 
    //HookService[Model] que los implemente
    v_preGet:{
        imp:number;  //--solo para ejemplo---
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