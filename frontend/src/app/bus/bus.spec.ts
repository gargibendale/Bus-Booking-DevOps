import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bus } from './bus';

describe('Bus', () => {
  let component: Bus;
  let fixture: ComponentFixture<Bus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Bus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
