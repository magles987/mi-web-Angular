//================================================================================================================================
//los servicios en angular implementas las funciones (en muchos casos las CRUD) de los datos recibidos 
// desde firebase, en otras palabras hace las veces de controller para angular

//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { IProducto, Producto, Producto_Util } from '../models/productos';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {


  private _productos: Observable<Producto[]> 

  private _productosCollection: AngularFirestoreCollection<Producto>;

  constructor(private _afs:AngularFirestore) {
    this._productosCollection = this._afs.collection<Producto>('Productos');

    //================================================================
    //obtener los toda la coleccion con los _id de cada documento
    //snippet tomado directamente de la guia oficial de angular+firebase
    //https://github.com/angular/angularfire2/blob/master/docs/firestore/collections.md

    this._productos = this._productosCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Producto;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );    
    //================================================================
   }

  //================================================================================================================================
  //Metodos CRUD:
  //================================================================
  //Leer todos los datos en Obsevables:
  leerProductos():Observable<Producto[]>{
    return this._afs.collection<Producto>('Productos')
           .snapshotChanges()
           .pipe(
              map(actions => actions.map(a => {
                    const data = a.payload.doc.data() as Producto;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                  }
                )
              )
            );    
  }   

  //================================================================
  //Leer todos los docuemntos de la coleccion con un filtro en observable
  leerProductosFiltro():Observable<any[]>{
    
    let Fnombre = 'ford';
    let Fprecio = '98';    

    return this._afs.collection<Producto>('Productos', ref=> {
      let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
      cursorQueryRef = cursorQueryRef.where('nombre', '==', Fnombre);
      cursorQueryRef = cursorQueryRef.where('precio', '==', Fprecio);
      return cursorQueryRef;
    })
    .snapshotChanges()
    .pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Producto;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  
  }  
 
  //================================================================


  leerProducoPorId(id : string){
    return this._productosCollection.doc(id);
  }

  actualizarProducto(producto:Producto){
    return this._productosCollection.doc(producto.id).update(producto);
  }

  eliminarProducto(id : string){
    return this._productosCollection.doc(id).delete();
  }

  crearProducto(producto:Producto){
    return this._productosCollection.add(producto);
  }  
  //================================================================================================================================





}
