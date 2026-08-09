declare module '@react-native-community/datetimepicker' {
  import type { ComponentType } from 'react';

  export interface DateTimePickerEvent {
    type: 'set' | 'neutral' | 'dismissed';
    nativeEvent: {
      timestamp: number | null;
      utcOffset: number;
    };
  }

  export interface DateTimePickerProps {
    value: Date;
    mode?: 'date' | 'time' | 'datetime';
    display?: 'default' | 'spinner' | 'calendar' | 'clock' | 'compact';
    onChange: (event: DateTimePickerEvent, date?: Date) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
    timeZoneOffsetInMinutes?: number;
    testID?: string;
  }

  declare const DateTimePicker: ComponentType<DateTimePickerProps>;
  export default DateTimePicker;
}
