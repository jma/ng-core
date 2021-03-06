/*
 * Invenio angular core
 * Copyright (C) 2019 RERO
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
import { AbstractControl } from '@angular/forms';
import { buildTitleMap, isArray } from 'angular6-json-schema-form';
import { Component, Input, OnInit } from '@angular/core';
import { JsonSchemaFormService } from 'angular6-json-schema-form';
import { RecordService } from '../../record.service';
import { ApiService } from '../../../api/api.service';
import { CoreConfigService } from '../../../core-config.service';

@Component({
  selector: 'ng-core-remote-select',
  templateUrl: './remote-select.component.html',
  styles: []
})
export class RemoteSelectComponent implements OnInit {

  formControl: AbstractControl;
  controlName: string;
  controlValue: any;
  controlDisabled = false;
  boundControl = false;
  options: any;
  selectList: any[] = [];
  isArray = isArray;
  @Input() layoutNode: any;
  @Input() layoutIndex: number[];
  @Input() dataIndex: number[];

  constructor(
    private jsf: JsonSchemaFormService,
    private recordService: RecordService,
    private apiService: ApiService,
    private configService: CoreConfigService
    ) { }

  ngOnInit() {
    this.options = this.layoutNode.options || {};
    // new option
    const remoteRecordType = this.options.remoteRecordType;
    if (remoteRecordType) {
      this.recordService.getRecords(remoteRecordType, '', 1, 30).subscribe(data => {
        data.hits.hits.map(record => {
          this.selectList.push({
            name: record.metadata.name,
            value: `${this.configService.$refPrefix}${this.apiService.endpointPrefix}/${remoteRecordType}/${record.metadata.pid}`
          });
        });
        this.jsf.initializeControl(this);
        this.formControl.setValue(null);
        // NOTE: default is not supported yet as it does not make sense
        if (this.controlValue) {
          this.formControl.setValue(this.controlValue);
        } else {
          if (this.options.placeHolder) {
            this.selectList.unshift({
              name: this.options.placeHolder,
              value: ''
            });
          }
          this.formControl.setValue(this.selectList[0].value);
        }
      });
    } else {
      this.selectList = buildTitleMap(
        this.options.titleMap || this.options.enumNames,
        this.options.enum, !!this.options.required, !!this.options.flatList
        );
      this.jsf.initializeControl(this);
      if (!this.controlValue) {
        if (this.options.default) {
          this.formControl.setValue(this.options.default);
        } else {
          if (this.options.placeHolder) {
            this.selectList.unshift({
              name: this.options.placeHolder,
              value: ''
            });
          }
          this.formControl.setValue(this.selectList[0].value);
        }
      }
    }
    // patch
    if (this.options.readonly && this.formControl) {
      this.formControl.disable();
    }
  }

  updateValue(event) {
    this.jsf.updateValue(this, event.target.value);
  }
}
