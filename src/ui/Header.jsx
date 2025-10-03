import styled from 'styled-components'
import HeaderMenu from './HeaderMenu'
import UserAvatar from '../features/authentication/UserAvatar'

const StyledHeader = styled.header`
  background-color: var(--color-grey-0);
  padding: 1.2rem 4.8rem;
  border-bottom: 1px solid var(--color-grey-100);
  display: flex;
  gap: 2.4rem;
  align-items: center;
  justify-content: flex-end;

  @media (max-width: 768px) {
    padding: 1.2rem 1.6rem;
    justify-content: space-between;
  }
`

const MenuButton = styled.button`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0.8rem;
    color: var(--color-grey-600);

    &:hover {
      color: var(--color-grey-800);
    }

    svg {
      width: 2.4rem;
      height: 2.4rem;
    }
  }
`

function Header({ onMenuClick }) {
  return (
    <StyledHeader>
      <MenuButton onClick={onMenuClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </MenuButton>
      <UserAvatar />
      <HeaderMenu />
    </StyledHeader>
  )
}

export default Header
