/*
* Invenio angular core
* Copyright (C) 2020 RERO
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as published by
* the Free Software Foundation, version 3 of the License.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
import { Component, Inject, OnInit, LOCALE_ID } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { formatDate } from '@angular/common';

@Component({
  selector: 'ng-core-editor-datepicker-type',
  template: `
    <div class="input-group">
      <div class="input-group-prepend">
        <div class="input-group-text">
          <i class="fa fa-calendar" aria-hidden="true"></i>
        </div>
      </div>
      <input
        type="text"
        class="form-control"
        [formControl]="formControl"
        [formlyAttributes]="field"
        [class.is-invalid]="showError"
        [placeholder]="to.placeholder"
        [readonly]="to.readonly"

        bsDatepicker
        [placement]="to.placement"
        [bsConfig]="to.bsConfig"
        [outsideClick]="to.outsideClick"
      >
    </div>
  `
})
export class DatepickerTypeComponent extends FieldType implements OnInit {

  /**
   * constructor
   * @param locale - string
   */
  constructor(@Inject(LOCALE_ID) private locale: string) {
    super();
  }

  /**
   * Init
   */
  ngOnInit() {
    this.initConfig();
    this.initValueChange();
  }

  /**
   * Init Config
   */
  private initConfig() {
    // Default bsConfig options for DatePicker
    const bsConfig = {
      showWeekNumbers: false,
      containerClass: 'theme-dark-blue',
      dateInputFormat: 'YYYY-MM-DD'
    };
    if ('bsConfig' in this.field.templateOptions) {
      this.field.templateOptions.bsConfig = {
        ...bsConfig,
        ...this.field.templateOptions.bsConfig
      };
    } else {
      this.field.templateOptions.bsConfig = bsConfig;
    }
    if (!('placement' in this.field.templateOptions)) {
      this.field.templateOptions.placement = 'bottom';
    }
    if (!('outsideClick' in this.field.templateOptions)) {
      this.field.templateOptions.outsideClick = true;
    }
    if (!('outputDateFormat' in this.field.templateOptions)) {
      this.field.templateOptions.outputDateFormat = 'yyy-MM-dd';
    }
  }

  /**
   * Init value change on field
   */
  private initValueChange() {
    this.formControl.valueChanges.subscribe(isoDate => {
      let patchDate: any;
      try {
        const date = new Date(isoDate);
        patchDate = formatDate(
          date,
          this.field.templateOptions.outputDateFormat,
          this.locale
        );
      } catch {
        patchDate = undefined;
      }
      if (this.formControl.value !== patchDate) {
        this.formControl.patchValue(patchDate);
      }
    });
  }
}