import { Component } from '@angular/core';

import { DialogService, ApiService, TranslateLanguageService, AlertService } from '@rero/ng-core';
import { DocumentComponent } from '../record/document/document.component';
import { InstitutionComponent } from '../record/institution/institution.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html'
})
export class HomeComponent {
  title = 'app-ng-core';
  apiData: object;
  testLanguageTranslation: string;
  recordConfig: object[] = [
    {
      key: 'documents',
      label: 'Documents',
      component: DocumentComponent
    },
    {
      key: 'institutions',
      label: 'Organisations',
      component: InstitutionComponent
    },
    {
      key: 'patrons',
      label: 'Utilisateurs'
    }
  ];

  constructor(
    private dialogService: DialogService,
    private apiService: ApiService,
    private translateLanguageService: TranslateLanguageService,
    private alertService: AlertService
  ) {
    this.apiData = {
      relative: this.apiService.getEndpointByType('documents'),
      absolute: this.apiService.getEndpointByType('documents', true),
    };

    this.testLanguageTranslation = this.translateLanguageService.translate('fr', 'fr');
  }

  showDialog() {
    const config = {
      ignoreBackdropClick: true,
      initialState: {
        title: 'Confirmation',
        body: 'Exit without saving changes?',
        confirmButton: true
      }
    };

    this.dialogService.show(config).subscribe((confirm: boolean) => {
      if (confirm) {
        console.log('Confirmed !');
      }
    });
  }

  doSearch(searchText: string) {
    console.log(`You search for: ${searchText}`);
  }

  addAlert() {
    const type = (document.getElementById('alert-type')) as HTMLSelectElement;
    const message = (document.getElementById('alert-message')) as HTMLInputElement;

    this.alertService.addAlert(type.value, message.value);
  }
}
