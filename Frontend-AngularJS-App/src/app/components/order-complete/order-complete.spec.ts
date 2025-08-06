import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderComplete } from './order-complete';

describe('OrderComplete', () => {
  let component: OrderComplete;
  let fixture: ComponentFixture<OrderComplete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderComplete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderComplete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
