import React from "react";
import { Navigate, useLocation } from "react-router";
import { logout } from "../common/actions";
import { useAuthState } from "../common/useAuthContext";

type RouteProp = {
  children: React.ReactNode;
  roles?: string[];
};

export const PrivateRoute = ({ children, roles }: RouteProp) => {
  const { state:{user}, dispatch } = useAuthState(); //read the values of loading and errorMessage from context
  const location = useLocation();

  if (!user) {
    // not logged in so redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // check if route is restricted by role
  if (roles && user.Roles && roles.indexOf(user.Roles[0]) === -1) {
    // role not authorised ==> logout
    logout(dispatch);
    return <Navigate to="/login" replace />;
  }

  // authorised so return component
  return children;
};
