import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession, Role } from './src/store';
import { NavHost, Route, Screens } from './src/nav';
import { C } from './src/theme';

import Login from './src/screens/Login';
import RoleSelect from './src/screens/RoleSelect';
import AdminNote from './src/screens/AdminNote';
import NotificationsScreen from './src/screens/Notifications';

import SellerHome from './src/screens/seller/SellerHome';
import NewListing from './src/screens/seller/NewListing';
import MyListings from './src/screens/seller/MyListings';
import SellerProfile from './src/screens/seller/SellerProfile';

import BuyerHome from './src/screens/buyer/BuyerHome';
import Browse from './src/screens/buyer/Browse';
import ListingDetail from './src/screens/buyer/ListingDetail';
import MyOrders from './src/screens/buyer/MyOrders';
import BuyerProfile from './src/screens/buyer/BuyerProfile';

import DriverHome from './src/screens/driver/DriverHome';
import Jobs from './src/screens/driver/Jobs';
import ActiveJob from './src/screens/driver/ActiveJob';
import Earnings from './src/screens/driver/Earnings';
import DriverProfile from './src/screens/driver/DriverProfile';

const SCREENS: Screens = {
  'seller.home': SellerHome,
  'seller.new': NewListing,
  'seller.listings': MyListings,
  'seller.profile': SellerProfile,

  'buyer.home': BuyerHome,
  'buyer.browse': Browse,
  'buyer.detail': ListingDetail,
  'buyer.orders': MyOrders,
  'buyer.profile': BuyerProfile,

  'driver.home': DriverHome,
  'driver.jobs': Jobs,
  'driver.job': ActiveJob,
  'driver.earnings': Earnings,
  'driver.profile': DriverProfile,

  'admin.home': AdminNote,

  notif: NotificationsScreen,
};

function homeFor(role: Role): Route {
  switch (role) {
    case 'buyer':
      return { name: 'buyer.home' };
    case 'driver':
      return { name: 'driver.home' };
    case 'admin':
      return { name: 'admin.home' };
    default:
      return { name: 'seller.home' };
  }
}

function Root() {
  const { ready, token, role } = useSession();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }
  if (!token) return <Login />;
  if (!role) return <RoleSelect />;

  return <NavHost screens={SCREENS} initial={homeFor(role)} resetKey={`${token}:${role}`} />;
}

export default function App() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Root />
    </SessionProvider>
  );
}
