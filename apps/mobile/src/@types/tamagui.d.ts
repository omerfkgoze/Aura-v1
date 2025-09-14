// Tamagui type stubs for CI compatibility
declare module '@tamagui/core' {
  import { Component } from 'react';

  export interface ViewProps {
    children?: any;
    style?: any;
    [key: string]: any;
  }

  export interface TextProps {
    children?: any;
    style?: any;
    fontSize?: string | number;
    fontWeight?: string;
    color?: string;
    [key: string]: any;
  }

  export interface ButtonProps {
    children?: any;
    onPress?: () => void;
    style?: any;
    [key: string]: any;
  }

  export const View: Component<ViewProps>;
  export const Text: Component<TextProps>;
  export const Button: Component<ButtonProps>;
  export const YStack: Component<ViewProps>;
  export const XStack: Component<ViewProps>;
  export const H2: Component<TextProps>;
  export const H3: Component<TextProps>;
  export const Paragraph: Component<TextProps>;
  export const ScrollView: Component<ViewProps>;
  export const Card: Component<ViewProps>;
  export const Circle: Component<ViewProps>;
  export const Sheet: Component<ViewProps>;
  export const Input: Component<any>;
  export const Separator: Component<ViewProps>;
  export const Switch: Component<any>;
  export const Slider: Component<any>;
  export const Progress: Component<any>;
  export const Avatar: Component<ViewProps>;
  export const Image: Component<any>;
  export const ListItem: Component<ViewProps>;
  export const Group: Component<ViewProps>;
  export const Label: Component<TextProps>;
  export const Fieldset: Component<ViewProps>;
  export const Spinner: Component<ViewProps>;
  export const Square: Component<ViewProps>;
  export const SizableText: Component<TextProps>;
  export const Stack: Component<ViewProps>;
  export const Theme: Component<any>;
  export const styled: any;
  export const config: any;
  export const createTamagui: any;
  export const TamaguiProvider: Component<any>;
}

declare module '@tamagui/alert-dialog' {
  import { Component } from 'react';

  export interface AlertDialogProps {
    children?: any;
    [key: string]: any;
  }

  export const AlertDialog: {
    Root: Component<AlertDialogProps>;
    Content: Component<AlertDialogProps>;
    Title: Component<AlertDialogProps>;
    Description: Component<AlertDialogProps>;
    Action: Component<AlertDialogProps>;
    Cancel: Component<AlertDialogProps>;
    Trigger: Component<AlertDialogProps>;
    Portal: Component<AlertDialogProps>;
    Overlay: Component<AlertDialogProps>;
  };
}

declare module '@tamagui/lucide-icons' {
  import { Component } from 'react';

  interface IconProps {
    size?: number | string;
    color?: string;
    style?: any;
    [key: string]: any;
  }

  export const Calendar: Component<IconProps>;
  export const Plus: Component<IconProps>;
  export const Minus: Component<IconProps>;
  export const Check: Component<IconProps>;
  export const X: Component<IconProps>;
  export const ChevronDown: Component<IconProps>;
  export const ChevronUp: Component<IconProps>;
  export const ChevronLeft: Component<IconProps>;
  export const ChevronRight: Component<IconProps>;
  export const Settings: Component<IconProps>;
  export const Bell: Component<IconProps>;
  export const User: Component<IconProps>;
  export const Lock: Component<IconProps>;
  export const Unlock: Component<IconProps>;
  export const Eye: Component<IconProps>;
  export const EyeOff: Component<IconProps>;
  export const Heart: Component<IconProps>;
  export const Activity: Component<IconProps>;
  export const TrendingUp: Component<IconProps>;
  export const BarChart3: Component<IconProps>;
  export const PieChart: Component<IconProps>;
  export const Shield: Component<IconProps>;
  export const ShieldAlert: Component<IconProps>;
  export const AlertTriangle: Component<IconProps>;
  export const Info: Component<IconProps>;
  export const Download: Component<IconProps>;
  export const Upload: Component<IconProps>;
  export const Sync: Component<IconProps>;
  export const RefreshCw: Component<IconProps>;
  export const Smartphone: Component<IconProps>;
  export const Laptop: Component<IconProps>;
  export const Tablet: Component<IconProps>;
  export const Wifi: Component<IconProps>;
  export const WifiOff: Component<IconProps>;
  export const Battery: Component<IconProps>;
  export const BatteryLow: Component<IconProps>;
  export const Volume2: Component<IconProps>;
  export const VolumeX: Component<IconProps>;
  export const Play: Component<IconProps>;
  export const Pause: Component<IconProps>;
  export const Stop: Component<IconProps>;
  export const SkipBack: Component<IconProps>;
  export const SkipForward: Component<IconProps>;
  export const RotateCcw: Component<IconProps>;
  export const RotateCw: Component<IconProps>;
  export const Save: Component<IconProps>;
  export const Trash2: Component<IconProps>;
  export const Edit: Component<IconProps>;
  export const Copy: Component<IconProps>;
  export const Clipboard: Component<IconProps>;
  export const Share: Component<IconProps>;
  export const ExternalLink: Component<IconProps>;
  export const Link: Component<IconProps>;
  export const Unlink: Component<IconProps>;
  export const Archive: Component<IconProps>;
  export const FileText: Component<IconProps>;
  export const File: Component<IconProps>;
  export const Folder: Component<IconProps>;
  export const FolderOpen: Component<IconProps>;
  export const Search: Component<IconProps>;
  export const Filter: Component<IconProps>;
  export const SortAsc: Component<IconProps>;
  export const SortDesc: Component<IconProps>;
  export const Grid: Component<IconProps>;
  export const List: Component<IconProps>;
  export const Menu: Component<IconProps>;
  export const MoreHorizontal: Component<IconProps>;
  export const MoreVertical: Component<IconProps>;
  export const Home: Component<IconProps>;
  export const Map: Component<IconProps>;
  export const MapPin: Component<IconProps>;
  export const Navigation: Component<IconProps>;
  export const Compass: Component<IconProps>;
  export const Clock: Component<IconProps>;
  export const Timer: Component<IconProps>;
  export const Stopwatch: Component<IconProps>;
  export const AlarmClock: Component<IconProps>;
  export const Sun: Component<IconProps>;
  export const Moon: Component<IconProps>;
  export const Star: Component<IconProps>;
  export const StarHalf: Component<IconProps>;
  export const Cloud: Component<IconProps>;
  export const CloudRain: Component<IconProps>;
  export const CloudSnow: Component<IconProps>;
  export const Zap: Component<IconProps>;
  export const Flame: Component<IconProps>;
  export const Thermometer: Component<IconProps>;
  export const Droplets: Component<IconProps>;
  export const Wind: Component<IconProps>;
  export const Umbrella: Component<IconProps>;
  export const Sunrise: Component<IconProps>;
  export const Sunset: Component<IconProps>;
  export const CloudLightning: Component<IconProps>;
  export const Cloudy: Component<IconProps>;
  export const PartlyCloudy: Component<IconProps>;
}

declare module 'tamagui' {
  export * from '@tamagui/core';
}

declare module '@my/ui' {
  import { Component } from 'react';

  export interface UIComponentProps {
    children?: any;
    [key: string]: any;
  }

  export const MyButton: Component<UIComponentProps>;
  export const MyInput: Component<UIComponentProps>;
  export const MyText: Component<UIComponentProps>;
  export const MyView: Component<UIComponentProps>;
  export const MyCard: Component<UIComponentProps>;
  export const MyModal: Component<UIComponentProps>;
  export const MyList: Component<UIComponentProps>;
  export const MyListItem: Component<UIComponentProps>;
  export const MyHeader: Component<UIComponentProps>;
  export const MyFooter: Component<UIComponentProps>;
  export const MySpinner: Component<UIComponentProps>;
  export const MyAlert: Component<UIComponentProps>;
  export const MyToast: Component<UIComponentProps>;
  export const MyTabs: Component<UIComponentProps>;
  export const MyTab: Component<UIComponentProps>;
  export const MyAccordion: Component<UIComponentProps>;
  export const MyCollapsible: Component<UIComponentProps>;
  export const MyDrawer: Component<UIComponentProps>;
  export const MyPopover: Component<UIComponentProps>;
  export const MyTooltip: Component<UIComponentProps>;
  export const MyBadge: Component<UIComponentProps>;
  export const MyChip: Component<UIComponentProps>;
  export const MyDivider: Component<UIComponentProps>;
  export const MySeparator: Component<UIComponentProps>;
  export const MySwitch: Component<UIComponentProps>;
  export const MyCheckbox: Component<UIComponentProps>;
  export const MyRadio: Component<UIComponentProps>;
  export const MySlider: Component<UIComponentProps>;
  export const MyProgress: Component<UIComponentProps>;
  export const MyAvatar: Component<UIComponentProps>;
  export const MyImage: Component<UIComponentProps>;
  export const MyIcon: Component<UIComponentProps>;
  export const MyLogo: Component<UIComponentProps>;
  export const MyBrand: Component<UIComponentProps>;
  export const MyLayout: Component<UIComponentProps>;
  export const MyContainer: Component<UIComponentProps>;
  export const MyRow: Component<UIComponentProps>;
  export const MyColumn: Component<UIComponentProps>;
  export const MyGrid: Component<UIComponentProps>;
  export const MyFlex: Component<UIComponentProps>;
  export const MyStack: Component<UIComponentProps>;
  export const MyGroup: Component<UIComponentProps>;
  export const MyPanel: Component<UIComponentProps>;
  export const MySection: Component<UIComponentProps>;
  export const MyRegion: Component<UIComponentProps>;
  export const MyArea: Component<UIComponentProps>;
  export const MyZone: Component<UIComponentProps>;
  export const MyBox: Component<UIComponentProps>;
  export const MyFrame: Component<UIComponentProps>;
  export const MyBorder: Component<UIComponentProps>;
  export const MyShadow: Component<UIComponentProps>;
  export const MyBackground: Component<UIComponentProps>;
  export const MyOverlay: Component<UIComponentProps>;
  export const MyMask: Component<UIComponentProps>;
  export const MyClip: Component<UIComponentProps>;
  export const MyShape: Component<UIComponentProps>;
  export const MyPattern: Component<UIComponentProps>;
  export const MyGradient: Component<UIComponentProps>;
  export const MyTexture: Component<UIComponentProps>;
  export const MyFilter: Component<UIComponentProps>;
  export const MyEffect: Component<UIComponentProps>;
  export const MyAnimation: Component<UIComponentProps>;
  export const MyTransition: Component<UIComponentProps>;
  export const MyTransform: Component<UIComponentProps>;
}
