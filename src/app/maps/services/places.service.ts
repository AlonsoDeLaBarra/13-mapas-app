import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PlacesResponse, Feature } from '../interfaces/places';
import { PlacesApiClient } from '../api/placesApiClient';
import { MapService } from './map.service';

@Injectable({
  providedIn: 'root'
})
export class PlacesService {

  public userLocation: [number, number] | undefined;
  public isLoadingPlaces: boolean = false;
  public places: Feature[] = [];

  get isUserLocationReady(): boolean {
    return !!this.userLocation;
  }

  constructor(
    private placesApi: PlacesApiClient,
    private mapService: MapService
  ) {
    this.getUserLocation();
   }

  getUserLocation(): Promise<[number, number]> {
    return new Promise( (resolve, rejected ) => {
      navigator.geolocation.getCurrentPosition(
        ( args ) => {
          this.userLocation = [args.coords.longitude, args.coords.latitude];
          resolve( this.userLocation )},
        ( err ) => {
          alert('No se pudo obtener la geolocalización');
          console.log(err);
          rejected();
        }
      );
    });
  }

  getPlacesByQuery( query: string = '' ) {

    if( query.length === 0) {
      this.places = [];
      this.isLoadingPlaces = false;
      return;
    }

    if ( !this.userLocation ) throw Error('No hay userLocation');

    this.isLoadingPlaces = true;

    this.placesApi.get<PlacesResponse>(`/${ query }.json`, {
      params: {
        proximity: this.userLocation.join(',')
      }
    })
      .subscribe( resp => {
        this.isLoadingPlaces = false;
        this.places = resp.features;
        this.mapService.createMarkersfromPlaces( this.places, this.userLocation! );
      });
  }
}
