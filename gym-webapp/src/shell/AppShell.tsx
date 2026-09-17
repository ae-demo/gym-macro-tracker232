import type { JSX } from "react";
import { Outlet, Link, useLocation } from "react-router";
import {
  AppShell as OxygenAppShell,
  Header,
  Sidebar,
  Footer,
  UserMenu,
  ColorSchemeToggle,
  Divider,
  Chip,
  Stack,
} from "@wso2/oxygen-ui";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Dumbbell,
  Target,
  History,
  UserCog,
  MessageSquare,
  Users,
  LogOut,
  User as UserIcon,
} from "@wso2/oxygen-ui-icons-react";
import { APP_NAME } from "../appName";
import { Can, useAuthz, useHeldRoles } from "../authz/gates";
import { signOut } from "../authz/session";
import { SCREEN_ROUTES } from "../authz/screens";

const ICON_BY_KEY: Record<string, JSX.Element> = {
  dashboard: <LayoutDashboard />,
  logmeal: <UtensilsCrossed />,
  logworkout: <Dumbbell />,
  targets: <Target />,
  history: <History />,
  coachaccess: <UserCog />,
  feedback: <MessageSquare />,
  coachdashboard: <Users />,
};

// Sidebar items with no visible nav entry (a detail route reached from a
// table row, never a rail link).
const RAIL_ITEMS = SCREEN_ROUTES.filter((s) => s.key in ICON_BY_KEY);

export function AppShell(): JSX.Element {
  const { pathname } = useLocation();
  const { username } = useAuthz();
  const roles = useHeldRoles();
  const active = RAIL_ITEMS.find((s) => pathname.startsWith(s.path))?.key ?? "";

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            {roles.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mr: 1 }}>
                {roles.map((role) => (
                  <Chip key={role} label={role} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            )}
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Signed in"} />
              <UserMenu.Header name={username || "Signed in"} email={username} />
              <UserMenu.Item icon={<UserIcon />} label="Profile" onClick={() => {}} />
              <UserMenu.Divider />
              <UserMenu.Logout icon={<LogOut />} onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {RAIL_ITEMS.map((screen) =>
                screen.loads ? (
                  <Can key={screen.key} op={screen.loads}>
                    <Sidebar.Item id={screen.key} link={<Link to={screen.path} />}>
                      <Sidebar.ItemIcon>{ICON_BY_KEY[screen.key]}</Sidebar.ItemIcon>
                      <Sidebar.ItemLabel>{screen.label}</Sidebar.ItemLabel>
                    </Sidebar.Item>
                  </Can>
                ) : (
                  <Sidebar.Item key={screen.key} id={screen.key} link={<Link to={screen.path} />}>
                    <Sidebar.ItemIcon>{ICON_BY_KEY[screen.key]}</Sidebar.ItemIcon>
                    <Sidebar.ItemLabel>{screen.label}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                ),
              )}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© {new Date().getFullYear()} WSO2 LLC.</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
