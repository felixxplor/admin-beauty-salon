import styled from 'styled-components'

import Logo from './Logo'
import MainNav from './MainNav'

const StyledSidebar = styled.aside`
  background-color: var(--color-grey-0);
  padding: 3.2rem 2.4rem;
  border-right: 1px solid var(--color-grey-100);
  grid-row: 1 / -1;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: ${(props) => (props.$isOpen ? '0' : '-100%')};
    height: 100%;
    width: 26rem;
    max-width: 80%;
    z-index: 999;
    transition: left 0.3s ease-in-out;
    box-shadow: ${(props) => (props.$isOpen ? '2px 0 8px rgba(0, 0, 0, 0.15)' : 'none')};
  }
`

const CloseButton = styled.button`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: absolute;
    top: 1.6rem;
    right: 1.6rem;
    background: none;
    border: none;
    font-size: 2.4rem;
    color: var(--color-grey-600);
    padding: 0.4rem;
    line-height: 1;

    &:hover {
      color: var(--color-grey-800);
    }
  }
`

function Sidebar({ isOpen, onClose }) {
  return (
    <StyledSidebar $isOpen={isOpen}>
      <CloseButton onClick={onClose}>&times;</CloseButton>
      <Logo />
      <MainNav />
    </StyledSidebar>
  )
}

export default Sidebar
