/* eslint-disable max-statements */
/* eslint-disable max-lines */
/* eslint-disable complexity */
/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
/* eslint-disable max-depth */
/* eslint-disable max-lines-per-function */
import { Booking } from "../2-business/booking";
import { CreditCard } from "../2-business/credit_card";
import { DateRange } from "../2-business/date_range";
import { IDestinationId } from "../2-business/destination";
import { DestinationFacade } from "../2-business/destination.facade";
import { EmailConfirmationComposer } from "../2-business/email_composer";
import { EmailSenderService } from "../2-business/email_sender.service";
import { OperatorsAPIService } from "../2-business/operators_api.service";
import { Payment } from "../2-business/payment";
import { PaymentService } from "../2-business/payment.service";
import { Traveler } from "../2-business/traveler";
import { TravelerFacade } from "../2-business/traveler.facade";

export class BookingsController {
  public traveler: Traveler | undefined;
  public destination?: IDestinationId;
  public create(
    destinationId: string,
    travelDates: DateRange,
    travelerId: string,
    passengersCount = 1
  ): Booking | undefined {
    if (this.hasInvalidData(destinationId, travelerId)) {
      return undefined;
    }
    this.traveler = TravelerFacade.loadTravelerById(travelerId);
    if (this.cantBookPassengerCount(this.traveler, passengersCount)) {
      return undefined;
    }
    const destination = DestinationFacade.loadDestinationById(destinationId);
    if (!destination) {
      return undefined;
    }
    this.destination = destination;
    if (!this.hasAvailability(this.destination, travelDates, passengersCount)) {
      return undefined;
    }
    const totalPrice = DestinationFacade.calculateTotalPrice(destination, travelDates, passengersCount);
    const booking = new Booking(destinationId, travelDates, travelerId, passengersCount, totalPrice);
    return booking;
  }

  public pay(booking: Booking | undefined, paymentMethod: string, creditCard: CreditCard): Payment | undefined {
    if (!booking) {
      return undefined;
    }
    if (this.isInvalidPaymentData(paymentMethod)) {
      return undefined;
    }
    const paymentGateway = new PaymentService();
    return paymentGateway.pay(booking.totalPrice, paymentMethod, creditCard);
  }
  public notifyConfirmationToTraveler(
    booking: Booking | undefined,
    payment: Payment | undefined,
    travelerEmail: string
  ): any {
    if (!booking) {
      return undefined;
    }
    if (!payment) {
      return undefined;
    }
    if (!travelerEmail) {
      return undefined;
    }
    // tell dont ask
    const emailSender = new EmailSenderService();
    const confirmationComposer = new EmailConfirmationComposer(booking, payment);
    return emailSender.sendToTraveler(confirmationComposer, travelerEmail);
  }
  public notifyBookingToOperator(destination: IDestinationId, passengersCount: number, payment: Payment): any {
    const providersApi = new OperatorsAPIService(destination.operatorId);
    return providersApi.sendBooking(destination, passengersCount, payment);
  }

  private hasAvailability(destination: IDestinationId, travelDates: DateRange, passengersCount: number): boolean {
    const operatorsApi: OperatorsAPIService = new OperatorsAPIService(destination.operatorId);
    const availability = operatorsApi.hasAvailability(destination.id, travelDates, passengersCount);
    return availability;
  }
  private areIdentifiersInvalid(destinationId: string, travelerId: string): boolean {
    if (destinationId.length == 0 || travelerId.length == 0) {
      return true;
    }
    return false;
  }
  private cantBookPassengerCount(traveler: Traveler, passengersCount: number): boolean {
    const maxPassengersPerBooking = 4;
    const maxPassengersPerVIPBooking = 6;
    if (
      passengersCount <= maxPassengersPerBooking ||
      (traveler.isVIP && passengersCount <= maxPassengersPerVIPBooking)
    ) {
      return false;
    }
    return true;
  }
  private hasInvalidData(destinationId: string, travelerId: string): boolean {
    if (this.areIdentifiersInvalid(destinationId, travelerId)) {
      return true;
    }
    return false;
  }
  private isInvalidPaymentData(paymentMethod: string) {
    if (!paymentMethod) {
      return true;
    }
    return false;
  }
}
