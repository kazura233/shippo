import React, { lazy } from 'react'
import { Switch, Route, Redirect, HashRouter } from 'react-router-dom'
import { withLoading } from '~/components/loading-hoc'
import { Home } from '~/layouts/home'
import { Passport } from '~/layouts/passport'
import { Provider } from 'react-redux'
import { rootStore } from '~/modules'
import { GlobalStyle } from '~/styles/global'

export const Root = () => {
  return (
    <Provider store={rootStore}>
      <GlobalStyle></GlobalStyle>
      <HashRouter>
        <Switch>
          <Route exact path="/" component={() => <Redirect to="/home" />}></Route>
          <Route exact path="/passport" component={Passport}></Route>
          <Route exact path="/home" component={Home}></Route>
          <Route exact path="/discover" component={Home}></Route>
          <Route exact path="/my" component={Home}></Route>
          <Route
            path="/space/:uid"
            component={withLoading(lazy(() => import('~/layouts/space')))}
          ></Route>
        </Switch>
      </HashRouter>
    </Provider>
  )
}

export default Root
