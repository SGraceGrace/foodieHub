import { Component } from '@angular/core';
import { SharedServiceService } from '../../core/shared/shared-service.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-search',
  imports: [],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {

  searchTerm$: Observable<string>;
  searchValue!: string;

  constructor(private sharedService : SharedServiceService) {
    this.searchTerm$ = this.sharedService.searchTerm$;
    this.searchTerm$.subscribe(term => this.searchValue = term);
  }
}
