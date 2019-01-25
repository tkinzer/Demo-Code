import React from "react";
import { StackNavigator, DrawerNavigator } from "react-navigation";
import { Root } from "native-base";

import Login from "./screens/Login";
import SignUp from "./screens/SignUp";
import SideBar from "./screens/Sidebar";
import Inbox from "./screens/Inbox/";
import Mail from "./screens/Mail/";
import Compose from "./screens/Compose/";
import Icons from "./screens/Icons/";
import ProgressBar from "./screens/Progressbar/";
import Spinner from "./screens/Spinner/";
import Contacts from "./screens/Contact/";
import Calendar from "./screens/Calendar/";
import Form from "./screens/Form/";
import ModalNSP from "./screens/Modal/";
import FooterTabNavigation from "./components/Footer/tabNavigation";

const Drawer = DrawerNavigator(
  {
    FooterTabNavigation: { screen: FooterTabNavigation },
    Inbox: { screen: Inbox },
    Mail: { screen: Mail },
    Compose: { screen: Compose },
    Icons: { screen: Icons },
    ProgressBar: { screen: ProgressBar },
    Contacts: { screen: Contacts },
    Spinner: { screen: Spinner },
    Calendar: { screen: Calendar },
    Form: { screen: Form },
    ModalNSP: { screen: ModalNSP }
  },
  {
    initialRouteName: "FooterTabNavigation",
    contentOptions: {
      activeTintColor: "#e91e63"
    },
    contentComponent: props => <SideBar {...props} />
  }
);

const App = StackNavigator(
  {
    Login: { screen: Login },
    SignUp: { screen: SignUp },
    Drawer: { screen: Drawer }
  },
  {
    index: 0,
    initialRouteName: "Login",
    headerMode: "none"
  }
);

export default () =>
  <Root>
    <App />
  </Root>;
