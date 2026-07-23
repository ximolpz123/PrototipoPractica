import UserProfileMenu from '../components/UserProfileMenu';

function Dashboard() {
  return (
    <div className="page" style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
      <UserProfileMenu />
      <h1>Dashboard</h1>
      <p>Panel principal — por implementar</p>
    </div>
  );
}

export default Dashboard;
