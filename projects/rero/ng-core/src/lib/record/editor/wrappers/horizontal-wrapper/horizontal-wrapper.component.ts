/*
 * RERO angular core
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
import { Component } from '@angular/core';
import { FieldWrapper, FormlyFieldConfig } from '@ngx-formly/core';
import { EditorService } from '../../services/editor.service';

@Component({
  selector: 'ng-core-horizontal-wrapper',
  template: `
    <div class="{{to.cssClass}} form-group m-0 d-flex">
      <!-- label -->
      <label [attr.for]="id" class="text-nowrap mr-2 col-form-label" *ngIf="to.label && to.hideLabel !== true" [tooltip]="to.description">
        {{ to.label }}<ng-container *ngIf="to.required && to.hideRequiredMarker !== true">&nbsp;*</ng-container>
      </label>
      <!-- field -->
      <div class="flex-grow-1">
        <ng-template #fieldComponent></ng-template>
        <div *ngIf="showError" class="invalid-feedback d-block">
          <formly-validation-message [field]="field"></formly-validation-message>
        </div>
      </div>
      <button type="button" *ngIf="canAdd()" (click)="add()" class="btn btn-link text-secondary btn-sm">
        <i class="fa fa-clone"></i>
      </button>
      <!-- trash button -->
      <button type="button" (click)="remove()" *ngIf="canRemove() && to.hideLabel !== true" class="btn btn-link text-secondary btn-sm">
        <i class="fa fa-trash"></i>
      </button>
    </div>
  `,
})
export class HorizontalWrapperComponent extends FieldWrapper {

  constructor(private _editorService: EditorService) {
    super();
  }

  getIndex() {
    if (this.field.parent.type === 'array') {
      return Number(this.field.key);
    }
    return null;
  }

  /**
   * Hide the field
   * @param field - FormlyFieldConfig, the field to hide
   */
  remove() {
    if (this.field.parent.type === 'object') {
      return this._editorService.hide(this.field);
    }
    if (this.field.parent.type === 'array') {

      return this.field.parent.templateOptions.remove(this.getIndex());
    }
  }

  /**
   * Is the field can be hidden?
   * @returns boolean, true if the field can be hidden
   */
  canRemove() {
    if (this.field.parent.type === 'object') {
      return this._editorService.canHide(this.field);
    }
    if (this.field.parent.type === 'array') {
      return this.field.parent.templateOptions.canRemove();
    }
    return false;
  }

  /**
   * Is the field can be hidden?
   * @returns boolean, true if the field can be hidden
   */
  canAdd() {
    if (this.field.parent.type === 'array') {
      return this.field.parent.templateOptions.canAdd();
    }
    return false;
  }
  /**
   * Add a new element
   * @param field - FormlyFieldConfig, the field to hide
   */
  add() {
    if (this.field.parent.type === 'array') {
      const i = this.getIndex() + 1;
      console.log('i:', i);
      return this.field.parent.templateOptions.add(this.getIndex() + 1);
    }
  }
}
