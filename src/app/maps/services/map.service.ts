import { Injectable } from '@angular/core';
import { AnySourceData, LngLatBounds, LngLatLike, Map, Marker, Popup } from 'mapbox-gl';
import { Feature } from '../interfaces/places';
import { DirectionsApiClient } from '../api';
import { DirectionsResponse, Route } from '../interfaces/directions';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  private map: Map | undefined;
  private markers: Marker[] = [];

  get isMapReady(){
    return !!this.map;
  }

  setMap( map: Map ) {
    this.map = map;
  }

  constructor(private directionsApi: DirectionsApiClient){

  }

  flyTo( coords: LngLatLike ) {
    if ( !this.isMapReady ) throw Error('El mapa no está inicializado');

    this.map?.flyTo( {
      zoom: 14,
      center: coords
    })

  }

  createMarkersfromPlaces( places: Feature[], userLocation: [number, number] ) {

    // Verifica que el mapa esté inicializado, sino devuelve un error
    if ( !this.map ) throw Error('Mapa no inicializado');

    // Elimina todos los marcadores existente del mapa
    this.markers.forEach( marker => marker.remove() );

    // Un arreglo temporal para almacenar los marcadores que se crearán
    const newMarkes: Marker[] = [];

    // procesa cada lugar encontrado para crear su correspondiente marcador
    places.forEach( place => {

      // Obtiene la longitud y latitud del lugar
      const [ lng, lat ] = place.center;

      // Crea un Popup con el texto y nombre del lugar
      const popup = new Popup()
        .setHTML(`
          <h6>${ place.text }</h6>
          <span>${ place.place_name }</span>
        `);

      // Crea un nuevo marcador
      const newMarker = new Marker()
        .setLngLat([ lng, lat])
        .setPopup( popup )
        .addTo( this.map! );

        // Agrega el nuevo marcador creado al arreglo de marcadores
        newMarkes.push( newMarker ) ;
    });
    // for (const place of places) {
    //   const [ lng, lat ] = place.center;
    //   const popup = new Popup()
    //     .setHTML(`
    //       <h6>${ place.text }</h6>
    //       <span>${ place.place_name }</span>
    //     `);
    //   const newMarker = new Marker()
    //     .setLngLat([ lng, lat])
    //     .setPopup( popup )
    //     .addTo( this.map );

    //     newMarkes.push( newMarker ) ;
    // }

    // 
    this.markers = newMarkes;

    if ( places.length === 0) return;

    //Limites del mapa
    const bounds = new LngLatBounds();
    this.markers.forEach( marker => bounds.extend( marker.getLngLat() ));
    bounds.extend(userLocation);

    this.map.fitBounds(bounds, {
      padding: 200
    });
  }


  getRouteBetweenPoints( start: [number, number], end: [number, number]){

    this.directionsApi.get<DirectionsResponse>(`/${start.join(',')};${end.join(',')}`)
      .subscribe( resp => this.drawPolyLine( resp.routes[0]) );

  }

  private drawPolyLine( ruta: Route) {

    console.log({ kms: ruta.distance / 1000, duracion: ruta.duration / 60 });

    if ( !this.map ) throw Error('Mapa no inicializado');

    const coords = ruta.geometry.coordinates;
    const bounds = new LngLatBounds();
    coords.forEach( ([lng,lat]) => {
      bounds.extend( [lng, lat]);
    });
    this.map?.fitBounds(bounds, { padding: 200 })

    // Polyline (LineString)
    const sourceData: AnySourceData = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coords
            }
          }
        ]
      }
    }

    //TODO: Limpiar ruta previa

    if ( this.map.getLayer('RouteString')) {
      this.map.removeLayer('RouteString');
      this.map.removeSource('RouteString');
    }

    this.map.addSource('RouteString', sourceData);

    this.map.addLayer({
      id: 'RouteString',
      type: 'line',
      source: 'RouteString',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': 'black',
        'line-width': 3
      }
    });


  }
}
