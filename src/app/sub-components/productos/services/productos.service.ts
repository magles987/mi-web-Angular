//================================================================================================================================
//los servicios en angular implementas las funciones (en muchos casos las CRUD) de los datos recibidos 
// desde firebase, en otras palabras hace las veces de controller para angular

//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { IProducto, Producto, Producto_Util } from '../models/productos';


@Injectable({
  providedIn: 'root'
})
export class ProductosService {

  private _util:Producto_Util;
  private _orderkey:number;

  private _productosCollection: AngularFirestoreCollection<Producto>;

  constructor(private _afs:AngularFirestore) {

    this._util = new Producto_Util();

    this._productosCollection = this._afs.collection<Producto>(this._util.getNomColeccion());

    //================================================================
    //obtener por observable el ultimo _orderkey
    let ob =  this._afs.collection<Producto>(this._util.getNomColeccion(), (ref)=>{
                let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
                cursorQueryRef = cursorQueryRef.orderBy(this._util._id.nom, "desc");
                return cursorQueryRef;              
              })
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
    ob.subscribe((docs)=>{
      if (docs.length > 0) {
        this._orderkey = this._util.getNumOrderKey(docs[0]._id); 
      }else{
        this._orderkey = this._util.getNumOrderKey("0-0000000000000000"); 
      }
    });        
    //================================================================
   }

  //================================================================================================================================
  //Metodos CRUD:
  //================================================================

  //================================================================
  //leerProductos con filtro y observable con consulta dinamica
  productoNombreFiltro$  = new BehaviorSubject<string|null>(null);
  productoPrecioFiltro$  = new BehaviorSubject<number|null>(null);
  productoRuedasFiltro$  = new BehaviorSubject<number|null>(null);

  leerProductosFiltroDinamico():Observable<Producto[]>{
    return combineLatest(
              this.productoNombreFiltro$,
              this.productoPrecioFiltro$,
              this.productoRuedasFiltro$
           )
           .pipe(
              switchMap(([Fnombre, Fprecio, Fruedas])=>{

                return this._afs.collection(this._util.getPathColeccion(), (ref)=>{
                  let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

                  if (Fnombre) {
                    cursorQueryRef = cursorQueryRef.where(this._util.nombre.nom, '==', Fnombre);
                  }
                  if (Fprecio) {
                    if (typeof Fprecio === 'string' && !Number.isNaN(Fprecio)) {
                        const n:any = Fprecio; 
                        Fprecio = parseInt(n);
                    }
                    cursorQueryRef = cursorQueryRef.where('precio', '>=', Fprecio);
                  }
                  if (Fruedas) {
                    if (typeof Fruedas === 'string' && !Number.isNaN(Fruedas)) {
                      const n:any = Fruedas; 
                      Fruedas = parseInt(n);
                    }
                    cursorQueryRef = cursorQueryRef.where('mis.ruedas', '>=', Fruedas);
                    cursorQueryRef = cursorQueryRef.orderBy('mis.ruedas', 'asc');
                  }

                  //--resolver problemas de orden en varios campos---
                  // cursorQueryRef = cursorQueryRef.orderBy('_orderKey', 'desc');
                  
                  return cursorQueryRef;
                })
                .snapshotChanges()
                .pipe(
                  map(actions => actions.map(a => {
                    const data = a.payload.doc.data() as Producto;
                    const id = a.payload.doc.id;
                    let result = { _id: id, ...data };
                    //================================================
                    //realizar la logica para antes de entregar los 
                    //datos leidos (configuraciones adicionales 
                    //o formateo de datos)
                    result = this._util.preLeer(result, {imp:20});
                    //================================================
                    return result;
                  }))                
                );
              })
           );  
  }  
 
  //================================================================


  //================================================================


  leerProducoPorId(id : string){
    return this._productosCollection.doc(id);
  }

  actualizarProducto(docEditado?:Producto):Promise<Producto>{
    //----------------[EN CONSTRUCCION]----------------
    docEditado = <Producto>{
      _id:"1-9c73bc52fc92837d",
      // nombre:"Spark GT",
      // categoria: "carro",
      // precio: 140,
      map_miscelanea:{
        // tipo:"vehiculo",
        ruedas: 4
      },
      mapA_misc:[
        // {color: "rojo"},
        {color: "Morado"}
      ],
      v_precioImpuesto : 120
    }    
    //------------------------------------------------

    return new Promise<Producto>((resolve, reject)=>{

      docEditado = this._util.preCrearOActualizar(docEditado);

      this._productosCollection.doc(docEditado._id).update(docEditado)
      .then(()=>{
        console.log(`el doc fue Editado: ${docEditado}` );
        resolve(docEditado);
      })
      .catch((err)=>{
        console.log(`error al editar el producto: ${err}` );
        reject(err);
      });
    });

  }

  eliminarProducto(v_id : string){
    return this._productosCollection.doc(v_id).delete();
  }

  // crearProducto_add(producto:Producto | any){
  //   return this._productosCollection.add(producto);
  // }  

  crearProducto_set(docNuevo?:Producto):Promise<Producto>{

    //--------------------------------------------------
    docNuevo = <Producto>{
      _id:"",
      nombre:"clio",
      categoria: "carro",
      precio: 80,
      map_miscelanea:{
        tipo:"vehiculo",
        ruedas: 4
      },
      mapA_misc:[
        {color: "negro"},
        {color: "blanco"}
      ],
      v_precioImpuesto : 120
    }
    //--------------------------------------------------

    return new Promise<Producto>((resolve, reject)=>{

      docNuevo = this._util.preCrearOActualizar(docNuevo, this._orderkey);

      this._productosCollection.doc(docNuevo._id).set(docNuevo, { merge: true })
      .then(()=>{
        console.log(`el doc fue creado: ${docNuevo}` );
        resolve(docNuevo);
      })
      .catch((err)=>{
        console.log(`error al crear el producto: ${err}` );
        reject(err);
      });
    });
  }  
  //================================================================================================================================

}
