import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusDetails } from './bus-details';

describe('BusDetails', () => {
  let component: BusDetails;
  let fixture: ComponentFixture<BusDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
