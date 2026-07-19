package com.giftpile.service;

import com.giftpile.entity.User;
import com.giftpile.repository.UserRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import java.util.Collection;
import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {
  private final UserRepository userRepository;

  public CustomUserDetailsService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    User user = userRepository.findByName(username)
      .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

    return new CustomUserDetails(user);
  }

  public static class CustomUserDetails implements UserDetails {
    private final User user;

    public CustomUserDetails(User user) {
      this.user = user;
    }

    public User getUser() {
      return user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
      if (user.getIsAdmin()) {
        return Collections.singleton(new SimpleGrantedAuthority("ROLE_ADMIN"));
      }
      return Collections.singleton(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getPassword() {
      return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
      return user.getName();
    }

    @Override
    public boolean isAccountNonExpired() {
      return true;
    }

    @Override
    public boolean isAccountNonLocked() {
      return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
      return true;
    }

    @Override
    public boolean isEnabled() {
      // Kids created without login capability can never establish a session.
      return Boolean.TRUE.equals(user.getCanLogin());
    }
  }
}
