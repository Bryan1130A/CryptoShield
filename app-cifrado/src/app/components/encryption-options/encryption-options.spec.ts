import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EncryptionOptions } from './encryption-options';

describe('EncryptionOptions', () => {
  let component: EncryptionOptions;
  let fixture: ComponentFixture<EncryptionOptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EncryptionOptions],
    }).compileComponents();

    fixture = TestBed.createComponent(EncryptionOptions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
