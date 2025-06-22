import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasskeyManagementComponent } from './passkey-management.component';

describe('PasskeyManagementComponent', () => {
  let component: PasskeyManagementComponent;
  let fixture: ComponentFixture<PasskeyManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PasskeyManagementComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasskeyManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
