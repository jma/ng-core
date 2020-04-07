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

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { FormGroup, FormControl } from '@angular/forms';
import { JSONSchema7 } from 'json-schema';
import { FormlyJsonschema } from '@ngx-formly/core/json-schema';
import { EditorService } from './editor.service';
import { orderedJsonSchema, isEmpty, removeEmptyValues } from './utils';
import { RecordService } from '../record.service';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { RecordUiService } from '../record-ui.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import { ApiService } from '../../api/api.service';

@Component({
  selector: 'ng-core-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit, OnDestroy {
  // angular formGroop root
  form: FormGroup;

  @Output() modelChange = new EventEmitter<any>();

  // initial data
  @Input()
  set model(value) {
    this._model = value;
  }
  get model() {
    // the parent dont know that we are editing a record
    if (this.pid != null && this._model.pid == null) {
      this._model.pid = this.pid;
    }
    // preprocess the model before sending to formly
    return this.preprocessRecord(this._model);
  }
  private _model: any = {};

  // additionnal form options
  options: FormlyFormOptions;

  // form configuration
  fields: FormlyFieldConfig[];

  // list of fields to display in the TOC
  tocFields = [];

  // JSONSchema
  schema: any;

  // mode for long editor
  longMode = false;

  // current record type from the url
  public recordType = null;

  // store pid on edit mode
  public pid = null;

  // subscribers
  private _subscribers: Subscription[] = [];

  // Config for resource
  private _resourceConfig: any;

  /**
   * Constructor
   * @param formlyJsonschema - FormlyJsonschema, the ngx-fomly jsonschema service
   */
  constructor(
    private formlyJsonschema: FormlyJsonschema,
    private recordService: RecordService,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private editorService: EditorService,
    private recordUiService: RecordUiService,
    private translateService: TranslateService,
    private toastrService: ToastrService,
    private location: Location
  ) {
    this.form = new FormGroup({});
  }

  /**
   * Component initialisation
   */
  ngOnInit() {
    combineLatest([this.route.params, this.route.queryParams])
      .subscribe(([params, queryParams]) => {
        // uncomment for debug
        // this.form.valueChanges.subscribe(v =>
        //   console.log('model', this.model, 'v', v, 'form', this.form)
        // );

        this.recordType = params.type;
        this.recordUiService.types = this.route.snapshot.data.types;
        this._resourceConfig = this.recordUiService.getResourceConfig(this.recordType);
        if (this._resourceConfig.editorLongMode === true) {
          this.longMode = true;
          this._subscribers.push(
            this.editorService.hiddenFields$.subscribe(() =>
              this.getTocFields()
            )
          );
        }
        this.pid = params.pid;
        this.recordService
          .getSchemaForm(this.recordType)
          .subscribe(schemaform => {
            this.setSchema(schemaform.schema);
          });
        // edition
        if (this.pid) {
          this.recordService
            .getRecord(this.recordType, this.pid)
            .subscribe(record => {
              this.recordUiService
                .canUpdateRecord$(record, this.recordType)
                .subscribe(result => {
                  if (result.can === false) {
                    this.toastrService.error(
                      this.translateService.instant(
                        'You cannot update this record'
                      ),
                      this.translateService.instant(this.recordType)
                    );
                    this.location.back();
                  } else {
                    this._model = record.metadata;
                    this.modelChange.emit(this._model);
                  }
                });
            });
        }
      });
  }

  /**
   * Component destruction
   */
  ngOnDestroy() {
    for (const s of this._subscribers) {
      s.unsubscribe();
    }
  }


  modelChanged(modelValue) {
    this.modelChange.emit(modelValue);
  }

  /**
   * Preprocess the record before passing it to the editor
   * @param record - Record object to preprocess
   */
  private preprocessRecord(record) {
    const config = this.recordUiService.getResourceConfig(this.recordType);

    if (config.preprocessRecordEditor) {
      return config.preprocessRecordEditor(record);
    }
    return record;
  }

  /**
   * Postprocess the record before save
   * @param record - Record object to postprocess
   */
  private postprocessRecord(record: any) {
    const config = this.recordUiService.getResourceConfig(this.recordType);

    if (config.postprocessRecordEditor) {
      return config.postprocessRecordEditor(record);
    }
    return record;
  }

  /**
   * Pre Create Record
   * @param record - Record object
   */
  private preCreateRecord(record: any) {
    const config = this.recordUiService.getResourceConfig(this.recordType);

    if (config.preCreateRecord) {
      return config.preCreateRecord(record);
    }
    return record;
  }

  /**
   * Pre Update Record
   * @param record - Record object
   */
  private preUpdateRecord(record: any) {
    const config = this.recordUiService.getResourceConfig(this.recordType);

    if (config.preUpdateRecord) {
      return config.preUpdateRecord(record);
    }
    return record;
  }

  /**
   * Preprocess the record before passing it to the editor
   * @param schema - object, JOSNSchemag
   */
  setSchema(schema) {
    // reorder all object properties
    this.schema = orderedJsonSchema(schema);
    this.options = {};

    // form configuration
    const fields = [
      this.formlyJsonschema.toFieldConfig(this.schema, {
        // post process JSONSChema7 to FormlyFieldConfig conversion
        map: (field: FormlyFieldConfig, jsonSchema: JSONSchema7) => {
          /**** additionnal JSONSchema configurations *******/
          // initial population of arrays with a minItems constraints
          if (jsonSchema.minItems && !jsonSchema.hasOwnProperty('default')) {
            field.defaultValue = new Array(jsonSchema.minItems);
          }
          const formOptions = jsonSchema.form;

          if (formOptions) {
            this.setSimpleOptions(field, formOptions);
            this.setValidation(field, formOptions);
            this.setRemoteSelectOptions(field, formOptions);
          }
          if (this.longMode === true) {
            // show the field if the model contains a value usefull for edition
            field.hooks = {
              ...field.hooks,
              onPopulate: (f) => {
                this.hideShowEmptyField(f);
              }
            };
          }

          field.templateOptions.longMode = this.longMode;

          if (this._resourceConfig.formFieldMap) {
            return this._resourceConfig.formFieldMap(field, jsonSchema);
          }

          // add a form-field wrapper for boolean (switch)
          if (field.type === 'boolean') {
            field.wrappers = [
              ...(field.wrappers ? field.wrappers : []),
              'form-field'
            ];
          }

          return field;
        }
      })
    ];
    this.fields = fields;
  }

  /**
   * Hide of show the field depending on the model value.
   * @param field formly field config
   */
  private hideShowEmptyField(field: FormlyFieldConfig) {
    let model = field.model;
    // for simple object the model is the parent dict
    if (
      !['object', 'multischema', 'array'].some(f => f === field.type)
    ) {
      model = field.model[field.key];
    }
    model = removeEmptyValues(model);
    const modelEmpty = isEmpty(model);
    if (!modelEmpty && (field.hide !== false)) {
      setTimeout(() => {
        field.hide = false;
        this.editorService.removeHiddenField(field);
      });
    }
    if (modelEmpty && (field.templateOptions.hide === true && field.hide === undefined)) {
      setTimeout(() => {
        field.hide = true;
        this.editorService.addHiddenField(field);
      });
    }
  }

  /**
   * Save the data on the server.
   * @param event - object, JSON to POST on the backend
   */
  submit(event) {
    let data = removeEmptyValues(this.model);
    data = this.postprocessRecord(data);
    if (data.pid != null) {
      this.recordService
        .update(this.recordType, this.preUpdateRecord(data))
        .subscribe(record => {
          this.toastrService.success(
            this.translateService.instant('Record Updated!'),
            this.translateService.instant(this.recordType)
          );
          this.recordUiService.redirectAfterSave(
            this.pid,
            record,
            this.recordType,
            'update',
            this.route
          );
        });
    } else {
      this.recordService
        .create(this.recordType, this.preCreateRecord(data))
        .subscribe(record => {
          this.toastrService.success(
            this.translateService.instant('Resource created'),
            this.translateService.instant(this.recordType)
          );
          this.recordUiService.redirectAfterSave(
            record.metadata.pid,
            record,
            this.recordType,
            'create',
            this.route
          );
        });
    }
  }

  /**
   * Scroll the window in to the DOM element corresponding to a given config field.
   * @param event - click DOM event
   * @param field - FormlyFieldConfig, the form config corresponding to the DOM element to jump to.
   */
  setFocus(event, field: FormlyFieldConfig) {
    event.preventDefault();
    this.editorService.setFocus(field, true);
  }

  /**
   * Populate the field to add to the TOC
   */
  getTocFields() {
    setTimeout(() => {
      if (this.fields && this.fields.length > 0) {
        this.tocFields = this.fields[0].fieldGroup.filter(f => f.hide !== true);
      }
    });
  }

  /**
   * Cancel editing and back to previous page
   */
  public cancel() {
    this.location.back();
  }

  /********************* Private  ***************************************/

  /**
   * Populate a select options with a remote API call.
   * @param field formly field config
   * @param formOptions JSONSchema object
   */
  private setRemoteSelectOptions(
    field: FormlyFieldConfig,
    formOptions: JSONSchema7
  ) {
    if (formOptions.remoteOptions && formOptions.remoteOptions.type) {
      field.type = 'select';
      field.hooks = {
        ...field.hooks,
        afterContentInit: (f: FormlyFieldConfig) => {
          const recordType = formOptions.remoteOptions.type;
          const query = formOptions.remoteOptions.query ? formOptions.remoteOptions.query : '';
          f.templateOptions.options = this.recordService
            .getRecords(recordType, query, 1, RecordService.MAX_REST_RESULTS_SIZE)
            .pipe(
              map(data =>
                data.hits.hits.map(record => {
                  return {
                    label: formOptions.remoteOptions.labelField && formOptions.remoteOptions.labelField in record.metadata
                      ? record.metadata[formOptions.remoteOptions.labelField]
                      : record.metadata.name,
                    value: this.apiService.getRefEndpoint(
                      recordType,
                      record.metadata.pid
                    )
                  };
                })
              )
            );
        }
      };
    }
  }

  /**
   *
   * @param field formly field config
   * @param formOptions JSONSchema object
   */
  private setValidation(field: FormlyFieldConfig, formOptions: JSONSchema7) {
    if (formOptions.validation) {
      // custom validation messages
      const messages = formOptions.validation.messages;
      if (messages) {
        if (!field.validation) {
          field.validation = {};
        }
        if (!field.validation.messages) {
          field.validation.messages = {};
        }
        for (const key of Object.keys(messages)) {
          field.validation.messages[key] = (error, f: FormlyFieldConfig) =>
            `${messages[key]}`;
        }
      }
      // custom validators
      if (formOptions.validation.validators) {
        // asyncValidators: valueAlreadyExists
        if (formOptions.validation.validators.valueAlreadyExists) {
          const remoteRecordType =
            formOptions.validation.validators.valueAlreadyExists.remoteRecordType;
          const limitToValues =
            formOptions.validation.validators.valueAlreadyExists.limitToValues;
          const filter =
            formOptions.validation.validators.valueAlreadyExists.filter;
          const term = formOptions.validation.validators.valueAlreadyExists.term;
          field.asyncValidators = {
            validation: [
              (control: FormControl) => {
                return this.recordService.uniqueValue(
                  field,
                  remoteRecordType ? remoteRecordType : this.recordType,
                  this.pid ? this.pid : null,
                  term ? term : null,
                  limitToValues ? limitToValues : [],
                  filter ? filter : null
                );
              }
            ]
          };
          delete formOptions.validation.validators.valueAlreadyExists;
        }
        // validators: add validator with expressions
        const validatorsKey = Object.keys(formOptions.validation.validators);
        validatorsKey.map(validatorKey => {
          const validator = formOptions.validation.validators[validatorKey];
          if ('expression' in validator && 'message' in validator) {
            const expression = validator.expression;
            const expressionFn = Function('formControl', `return ${expression};`);
            const validatorExpression = {
              expression: (fc: FormControl) => expressionFn(fc),
              message: validator.message
            };
            field.validators = field.validators !== undefined ? field.validators : {};
            field.validators[validatorKey] = validatorExpression;
          }
        });
      }
    }
  }

  /**
   * Convert JSONSchema form options to formly field options.
   * @param field formly field config
   * @param formOptions JSONSchema object
   */
  private setSimpleOptions(field: FormlyFieldConfig, formOptions: JSONSchema7) {
    // ngx formly standard options
    // hide a field at startup
    if (formOptions.hide === true) {
      field.templateOptions.hide = true;
    }
    // wrappers
    if (formOptions.wrappers && formOptions.wrappers.length > 0) {
      field.wrappers = [
        ...(field.wrappers ? field.wrappers : []),
        ...formOptions.wrappers
      ];
    }
    // custom type
    if (formOptions.type != null) {
      field.type = formOptions.type;
    }
    // put the focus in this field
    if (formOptions.focus === true) {
      field.focus = true;
    }
    // input placeholder
    if (formOptions.placeholder) {
      field.templateOptions.placeholder = formOptions.placeholder;
    }
    // select labels and values
    if (formOptions.options) {
      field.templateOptions.options = formOptions.options;
    }
    // expression properties
    if (formOptions.expressionProperties) {
      field.expressionProperties = formOptions.expressionProperties;
    }
    // hide expression
    if (formOptions.hideExpression) {
      field.hideExpression = formOptions.hideExpression;
    }

    // non ngx formly options
    // custom help URL displayed  in the object dropdown
    if (formOptions.helpURL) {
      field.templateOptions.helpURL = formOptions.helpURL;
    }
    // custom field for navigation options
    if (formOptions.navigation) {
      field.templateOptions.navigation = formOptions.navigation;
    }

    // template options
    if (formOptions.templateOptions) {
      field.templateOptions = {
        ...field.templateOptions,
        ...formOptions.templateOptions
      };
    }
  }
}
