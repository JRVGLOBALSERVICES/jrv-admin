export type CarMaintenanceRow = {
  id: string;
  plate_number: string;
  car_type: string; // Model
  current_mileage: number;
  next_service_mileage: number;
  next_gear_oil_mileage: number;
  next_tyre_mileage: number;
  next_brake_pad_mileage: number;
  status: string; // Car status
  track_insurance?: boolean;
};
