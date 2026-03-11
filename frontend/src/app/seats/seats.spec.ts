import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Seats } from './seats';

describe('Seats', () => {
  let component: Seats;
  let fixture: ComponentFixture<Seats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Seats]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Seats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
