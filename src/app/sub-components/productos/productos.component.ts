import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from "@angular/forms";
import { IProducto, Producto } from './models/productos';
import { ProductosService } from './services/productos.service';


@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {

  public formProductos:FormGroup;

  public productos:Producto[];

  public productosFiltrados:Producto[];

  constructor(private _ProductosServices:ProductosService) {
    
  }

  enviar(){
    console.log(this.formProductos.value);
    let d = this._ProductosServices.crearProducto(this.formProductos.value);
    d.then(data=>{
      console.log("Bien987: " + data);
    })
    .catch(err=>{
      console.log(err);
    })
    this.formProductos.reset();
  }

  ngOnInit() {
    //================================================================
    //configurar las opciones del formulario
    let formControls:any = <IProducto>{
      // $_id: new FormControl(''),
      nombre : new FormControl(''),
      categoria : new FormControl(''),
      precio : new FormControl('')    
    };

    this.formProductos = new FormGroup(formControls); 
    //================================================================
    //================================================================
    //Descargar los datos de la bd
    this._ProductosServices.leerProductos().subscribe((dataRes)=>{
      this.productos = dataRes;
    });

    this._ProductosServices.leerProductosFiltro().subscribe((dataRes)=>{
      this.productosFiltrados = dataRes;
    });    
    //================================================================


  }

}
